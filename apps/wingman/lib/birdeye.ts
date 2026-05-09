import { BirdeyeClient } from "@vivekpal1/birdeye-mcp/client";

let cachedClient: BirdeyeClient | null = null;

export function getBirdeye(): BirdeyeClient {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) {
    throw new Error("BIRDEYE_API_KEY is not set on the server. Add it to .env.local or Vercel project env.");
  }
  cachedClient = new BirdeyeClient({ apiKey, defaultChain: "solana", cacheTtlMs: 60_000 });
  return cachedClient;
}

export type DDPayload = {
  mint: string;
  overview: Awaited<ReturnType<BirdeyeClient["tokenOverview"]>>;
  security: Awaited<ReturnType<BirdeyeClient["tokenSecurity"]>>;
  holders: Awaited<ReturnType<BirdeyeClient["tokenHolders"]>>;
  ohlcv: Awaited<ReturnType<BirdeyeClient["ohlcv"]>>;
};

function logFail(label: string, e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error(`[wingman] ${label} failed: ${message}`);
}

// The client enforces a global 1.1s gap between outbound calls and coalesces
// duplicates, so we can fire all four in parallel without burning the free tier.
// /defi/token_security requires Premium and will 401 on free tier — we
// gracefully degrade and derive flags from overview + holders instead.
export async function fetchDDData(mint: string): Promise<DDPayload> {
  const client = getBirdeye();
  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - 86400;

  const [overview, ohlcv, holders, security] = await Promise.all([
    client.tokenOverview(mint).catch((e) => { logFail("token_overview", e); return {} as DDPayload["overview"]; }),
    client.ohlcv(mint, "1H", dayAgo, now).catch((e) => { logFail("token_ohlcv", e); return { items: [] } as DDPayload["ohlcv"]; }),
    client.tokenHolders(mint, { limit: 10 }).catch((e) => { logFail("token_holders", e); return { items: [] } as DDPayload["holders"]; }),
    client.tokenSecurity(mint).catch((e) => { logFail("token_security (gated on free tier)", e); return {} as DDPayload["security"]; }),
  ]);

  return { mint, overview, security, holders, ohlcv };
}

export function summariseRiskFlags(payload: DDPayload) {
  const sec = payload.security ?? {};
  const ov = payload.overview ?? {};
  const holders = payload.holders?.items ?? [];
  const haveSecurity = Object.keys(sec).length > 0;
  const flags: { label: string; status: "good" | "warn" | "bad"; detail?: string }[] = [];

  // Mint / freeze authority — only knowable from token_security (Premium).
  if (haveSecurity) {
    flags.push(sec.mintAuthority
      ? { label: "Mint authority", status: "bad", detail: "Active — supply can be inflated." }
      : { label: "Mint authority", status: "good", detail: "Revoked — supply locked." });
    flags.push(sec.freezeAuthority
      ? { label: "Freeze authority", status: "warn", detail: "Active — wallets can be frozen." }
      : { label: "Freeze authority", status: "good", detail: "Revoked." });
    if (sec.transferFeeEnable) flags.push({ label: "Transfer fee", status: "warn", detail: "Token has on-transfer fee." });
    if (sec.isToken2022) flags.push({ label: "Token-2022", status: "warn", detail: "Uses Token-2022 — verify extensions." });
  }

  // Top-10 concentration: prefer security payload, else compute from holder list
  // (Birdeye's v3 holder endpoint returns ui_amount but not percentage; we derive it).
  const securityTop10 = sec.top10HolderPercent ?? sec.top10UserPercent;
  let top10Pct: number | null = null;
  if (typeof securityTop10 === "number") {
    top10Pct = securityTop10 > 1 ? securityTop10 : securityTop10 * 100;
  } else if (holders.length > 0) {
    const totalSupply = ov.circulatingSupply ?? ov.totalSupply;
    if (typeof totalSupply === "number" && totalSupply > 0) {
      const sumUi = holders.slice(0, 10).reduce((acc, h) => acc + (h.ui_amount ?? 0), 0);
      if (sumUi > 0) top10Pct = (sumUi / totalSupply) * 100;
    } else {
      const sumPct = holders.slice(0, 10).reduce((acc, h) => acc + (h.percentage ?? 0), 0);
      if (sumPct > 0) top10Pct = sumPct > 1 ? sumPct : sumPct * 100;
    }
  }
  if (top10Pct != null) {
    const pct = top10Pct;
    flags.push({
      label: "Top-10 holders",
      status: pct > 50 ? "bad" : pct > 30 ? "warn" : "good",
      detail: `${pct.toFixed(1)}% concentrated.`,
    });
  }

  // Liquidity
  if (typeof ov.liquidity === "number") {
    flags.push({
      label: "Liquidity",
      status: ov.liquidity < 10_000 ? "bad" : ov.liquidity < 100_000 ? "warn" : "good",
      detail: `$${Math.round(ov.liquidity).toLocaleString()}${ov.liquidity < 10_000 ? " — very thin." : "."}`,
    });
  }

  // 24h volume sanity
  if (typeof ov.v24hUSD === "number" && ov.v24hUSD > 0 && typeof ov.liquidity === "number" && ov.liquidity > 0) {
    const turnover = ov.v24hUSD / ov.liquidity;
    flags.push({
      label: "24h vol/liq",
      status: turnover > 100 ? "warn" : turnover < 0.1 ? "warn" : "good",
      detail: `${turnover.toFixed(1)}× turnover.`,
    });
  }

  if (!haveSecurity) {
    flags.push({
      label: "Mint/freeze authority",
      status: "warn",
      detail: "Premium-only data — verify directly on chain.",
    });
  }

  return flags;
}

export function fmtUsd(n: number | undefined | null): string {
  if (n == null || !isFinite(n)) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toExponential(2)}`;
}

export function fmtPct(n: number | undefined | null): string {
  if (n == null || !isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}
