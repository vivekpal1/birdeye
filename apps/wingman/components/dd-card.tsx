import { fmtPct, fmtUsd, summariseRiskFlags, type DDPayload } from "@/lib/birdeye";
import { verdictTone, type Verdict } from "@/lib/verdict";

type Props = { payload: DDPayload; verdict: Verdict };

export function DDCard({ payload, verdict }: Props) {
  const ov = payload.overview ?? ({} as DDPayload["overview"]);
  const flags = summariseRiskFlags(payload);
  const tone = verdictTone(verdict.verdict);
  const candles = payload.ohlcv?.items ?? [];

  return (
    <article className="mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-8 shadow-2xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40">Wingman DD</div>
          <h1 className="mt-1 flex items-baseline gap-3 text-3xl font-bold">
            <span>{ov.symbol ?? "—"}</span>
            <span className="text-base font-normal text-white/40">{ov.name ?? ""}</span>
          </h1>
        </div>
        <div className={`rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm font-semibold ${tone.color}`}>
          {tone.emoji} {tone.label}
        </div>
      </header>

      <p className="mt-6 text-balance text-lg leading-snug text-white/90">
        {verdict.one_liner}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Price" value={fmtUsd(ov.price)} />
        <Stat label="24h" value={fmtPct(ov.priceChange24hPercent)}
              tone={(ov.priceChange24hPercent ?? 0) >= 0 ? "good" : "bad"} />
        <Stat label="Mcap" value={fmtUsd(ov.marketCap)} />
        <Stat label="Liquidity" value={fmtUsd(ov.liquidity)} />
        <Stat label="24h vol" value={fmtUsd(ov.v24hUSD)} />
        <Stat label="Holders" value={ov.holder ? ov.holder.toLocaleString() : "—"} />
        <Stat label="Markets" value={ov.numberMarkets?.toString() ?? "—"} />
        <Stat label="Vibe" value={verdict.vibes.replace(/-/g, " ")} />
      </div>

      <Sparkline candles={candles} />

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Bullets title="Strengths" items={verdict.strengths} accent="text-leaf" />
        <Bullets title="Risks" items={verdict.risks} accent="text-rug" />
      </div>

      <div className="mt-8">
        <div className="mb-2 text-xs uppercase tracking-widest text-white/40">Security flags</div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {flags.map((f) => (
            <li key={f.label} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm">
              <span className="text-white/70">{f.label}</span>
              <span className={
                f.status === "good" ? "text-leaf" :
                f.status === "warn" ? "text-warn" : "text-rug"
              }>
                {f.detail}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <footer className="mt-8 flex items-center justify-between border-t border-white/5 pt-4 text-xs text-white/40">
        <span className="font-mono">{payload.mint.slice(0, 6)}…{payload.mint.slice(-4)}</span>
        <span>powered by Birdeye Data + Claude</span>
      </footer>
    </article>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className={
        "mt-1 text-base font-semibold " +
        (tone === "good" ? "text-leaf" : tone === "bad" ? "text-rug" : "text-white")
      }>
        {value}
      </div>
    </div>
  );
}

function Bullets({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  return (
    <div>
      <div className={"mb-2 text-xs uppercase tracking-widest " + accent}>{title}</div>
      <ul className="space-y-1.5">
        {items.length === 0 && <li className="text-sm text-white/40">—</li>}
        {items.map((i, idx) => (
          <li key={idx} className="flex gap-2 text-sm text-white/80">
            <span className={accent}>•</span><span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sparkline({ candles }: { candles: { c: number; unixTime: number }[] }) {
  if (candles.length < 2) return <div className="mt-6 h-20 rounded-xl border border-white/5 bg-black/20" />;
  const closes = candles.map((c) => c.c);
  const min = Math.min(...closes), max = Math.max(...closes);
  const span = max - min || 1;
  const w = 600, h = 80;
  const pts = candles.map((c, i) => {
    const x = (i / (candles.length - 1)) * w;
    const y = h - ((c.c - min) / span) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const last = closes[closes.length - 1];
  const first = closes[0];
  const up = last >= first;
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-white/5 bg-black/20 p-3">
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-white/40">
        <span>24h close</span>
        <span className={up ? "text-leaf" : "text-rug"}>
          {fmtPct(((last - first) / first) * 100)}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full">
        <polyline
          fill="none"
          stroke={up ? "#22C55E" : "#EF4444"}
          strokeWidth={2}
          points={pts}
        />
      </svg>
    </div>
  );
}
