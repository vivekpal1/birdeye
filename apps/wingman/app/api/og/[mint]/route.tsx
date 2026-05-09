import { ImageResponse } from "@vercel/og";
import { fetchDDData, fmtPct, fmtUsd, summariseRiskFlags } from "@/lib/birdeye";
import { generateVerdict, verdictTone } from "@/lib/verdict";

export const runtime = "nodejs";
const size = { width: 1200, height: 630 };

const COLORS = {
  bg: "#0A0A0B",
  card: "#111114",
  white: "#F5F5F7",
  mute: "#7A7A82",
  flame: "#FF7A00",
  leaf: "#22C55E",
  warn: "#F59E0B",
  rug: "#EF4444",
};

export async function GET(_req: Request, ctx: { params: Promise<{ mint: string }> }) {
  const { mint } = await ctx.params;

  if (mint === "landing") return landingCard();

  let payload, verdict;
  try {
    payload = await fetchDDData(mint);
    if (!payload.overview?.symbol) return errorCard("token not found");
    verdict = await generateVerdict(payload);
  } catch (e) {
    return errorCard(e instanceof Error ? e.message : "error");
  }

  const ov = payload.overview;
  const tone = verdictTone(verdict.verdict);
  const flags = summariseRiskFlags(payload).slice(0, 4);
  const verdictColor =
    verdict.verdict === "LOOKS_CLEAN" ? COLORS.leaf :
    verdict.verdict === "PROCEED_WITH_CAUTION" ? COLORS.warn :
    COLORS.rug;

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: COLORS.bg, padding: 56, fontFamily: "system-ui",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: COLORS.mute, fontSize: 22, letterSpacing: 4, textTransform: "uppercase" }}>
            <span style={{ width: 10, height: 10, background: COLORS.flame, borderRadius: 999 }} />
            Wingman DD
          </div>
          <div style={{
            padding: "10px 24px", borderRadius: 999, border: `2px solid ${verdictColor}`,
            color: verdictColor, fontSize: 24, fontWeight: 600,
          }}>
            {tone.emoji} {tone.label.toUpperCase()}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 36 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18, color: COLORS.white }}>
            <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>${ov.symbol}</div>
            <div style={{ fontSize: 36, color: COLORS.mute }}>{ov.name}</div>
          </div>
          <div style={{ marginTop: 12, color: COLORS.white, fontSize: 32, lineHeight: 1.25, maxWidth: 1080 }}>
            {verdict.one_liner}
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 36 }}>
          <Stat label="Price" value={fmtUsd(ov.price)} color={COLORS.white} />
          <Stat
            label="24h"
            value={fmtPct(ov.priceChange24hPercent)}
            color={(ov.priceChange24hPercent ?? 0) >= 0 ? COLORS.leaf : COLORS.rug}
          />
          <Stat label="Mcap" value={fmtUsd(ov.marketCap)} color={COLORS.white} />
          <Stat label="Liquidity" value={fmtUsd(ov.liquidity)} color={COLORS.white} />
          <Stat label="24h vol" value={fmtUsd(ov.v24hUSD)} color={COLORS.white} />
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
          {flags.map((f) => (
            <div key={f.label} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 999, background: COLORS.card,
              border: `1px solid ${
                f.status === "good" ? COLORS.leaf :
                f.status === "warn" ? COLORS.warn : COLORS.rug
              }`,
              color: f.status === "good" ? COLORS.leaf : f.status === "warn" ? COLORS.warn : COLORS.rug,
              fontSize: 22,
            }}>
              {f.status === "good" ? "✓" : f.status === "warn" ? "!" : "✕"} {f.label}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: "auto", justifyContent: "space-between", alignItems: "center", color: COLORS.mute, fontSize: 22 }}>
          <div style={{ display: "flex", fontFamily: "monospace" }}>
            {mint.slice(0, 8)}…{mint.slice(-6)}
          </div>
          <div style={{ display: "flex" }}>wingman.app · powered by Birdeye + Claude</div>
        </div>
      </div>
    ),
    size,
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", padding: "16px 20px",
      borderRadius: 16, background: COLORS.card, minWidth: 180,
    }}>
      <div style={{ color: COLORS.mute, fontSize: 18, letterSpacing: 3, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ color, fontSize: 36, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function landingCard() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center", background: COLORS.bg,
        fontFamily: "system-ui",
      }}>
        <div style={{ display: "flex", color: COLORS.flame, fontSize: 28, letterSpacing: 6, textTransform: "uppercase" }}>
          🦅 Wingman
        </div>
        <div style={{ display: "flex", color: COLORS.white, fontSize: 100, fontWeight: 800, marginTop: 24, textAlign: "center", lineHeight: 1 }}>
          Paste a token.<br />Get the truth.
        </div>
        <div style={{ display: "flex", color: COLORS.mute, fontSize: 32, marginTop: 32 }}>
          AI-powered Solana DD · Birdeye + Claude
        </div>
      </div>
    ),
    size,
  );
}

function errorCard(msg: string) {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center",
        background: COLORS.bg, color: COLORS.rug, fontSize: 48, fontFamily: "system-ui",
      }}>
        Wingman couldn’t resolve that token: {msg}
      </div>
    ),
    size,
  );
}
