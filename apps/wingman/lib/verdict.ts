import { generateObject } from "ai";
import { z } from "zod";
import { summariseRiskFlags, type DDPayload } from "./birdeye";
import { getVerdictModel } from "./model";

export const VerdictSchema = z.object({
  verdict: z
    .enum(["LOOKS_CLEAN", "PROCEED_WITH_CAUTION", "HIGH_RISK", "LIKELY_RUG"])
    .describe("One of four buckets, conservative by default."),
  one_liner: z.string().min(8).max(220).describe("A punchy one-sentence summary the user could tweet. Hard cap 220 characters."),
  strengths: z.array(z.string().min(4).max(140)).max(4).describe("Up to 4 short bullet positives."),
  risks: z.array(z.string().min(4).max(140)).max(4).describe("Up to 4 short bullet risks."),
  vibes: z
    .enum(["degen-ape", "blue-chip", "fresh-mint", "post-pump-cooldown", "stealth-launch", "rug-shaped"])
    .describe("A flavor tag for the share card."),
});

export type Verdict = z.infer<typeof VerdictSchema>;

const SYSTEM = `You are Wingman, an onchain due-diligence co-pilot.
You are given a Birdeye snapshot of a Solana token: overview, security flags, top 10 holders, last 24h hourly candles.
You produce a SHORT, balanced verdict for a trader who is about to buy.

Rules:
- Be conservative. If anything is missing, prefer caution.
- Ground every claim in the data. Do not invent information not present.
- Tone is sharp, builder/trader-native, lower-case OK, no slop.
- HARD LIMITS:
  - one_liner: <= 220 characters total. Aim for ~160. One sentence.
  - each strength / risk bullet: <= 140 characters.
- Strengths and risks are concrete: numbers, not adjectives. ("$420k liquidity", "top-10 hold 47%").`;

export async function generateVerdict(payload: DDPayload): Promise<Verdict> {
  const flags = summariseRiskFlags(payload);
  const ov = payload.overview ?? {};
  const sec = payload.security ?? {};
  const candles = payload.ohlcv?.items ?? [];
  const first = candles[0]?.c;
  const last = candles[candles.length - 1]?.c;
  const change24h = first && last ? ((last - first) / first) * 100 : null;

  const compact = {
    symbol: ov.symbol,
    name: ov.name,
    price: ov.price,
    priceChange24hPercent: ov.priceChange24hPercent,
    marketCap: ov.marketCap,
    liquidity: ov.liquidity,
    holderCount: ov.holder,
    volume24hUSD: ov.v24hUSD,
    creationTime: sec.creationTime,
    creatorAddress: sec.creatorAddress,
    mintAuthorityRevoked: !sec.mintAuthority,
    freezeAuthorityRevoked: !sec.freezeAuthority,
    isToken2022: sec.isToken2022,
    transferFeeEnabled: sec.transferFeeEnable,
    top10HolderPercent: sec.top10HolderPercent ?? sec.top10UserPercent,
    topHolders: (payload.holders?.items ?? []).slice(0, 5).map((h) => ({
      owner: h.owner,
      pct: h.percentage,
    })),
    flags,
    change24h_from_candles_pct: change24h,
    candle_count: candles.length,
  };

  const { model } = getVerdictModel();
  const { object } = await generateObject({
    model,
    schema: VerdictSchema,
    system: SYSTEM,
    prompt: `Birdeye snapshot:\n${JSON.stringify(compact, null, 2)}\n\nProduce the verdict.`,
    temperature: 0.4,
  });

  return object;
}

export function verdictTone(v: Verdict["verdict"]): { color: string; emoji: string; label: string } {
  switch (v) {
    case "LOOKS_CLEAN": return { color: "text-leaf", emoji: "✅", label: "Looks clean" };
    case "PROCEED_WITH_CAUTION": return { color: "text-warn", emoji: "⚠️", label: "Proceed with caution" };
    case "HIGH_RISK": return { color: "text-rug", emoji: "🚨", label: "High risk" };
    case "LIKELY_RUG": return { color: "text-rug", emoji: "💀", label: "Likely rug" };
  }
}
