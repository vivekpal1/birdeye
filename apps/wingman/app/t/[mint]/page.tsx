import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { fetchDDData } from "@/lib/birdeye";
import { generateVerdict } from "@/lib/verdict";
import { DDCard } from "@/components/dd-card";

type Params = { params: Promise<{ mint: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { mint } = await params;
  return {
    title: `Wingman DD · ${mint.slice(0, 6)}…${mint.slice(-4)}`,
    description: "AI-powered DD card. Powered by Birdeye Data + Claude.",
    openGraph: { images: [`/api/og/${mint}`] },
    twitter: { card: "summary_large_image", images: [`/api/og/${mint}`] },
  };
}

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function TokenDD({ params }: Params) {
  const { mint } = await params;

  return (
    <main className="relative z-10 mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="mb-8 inline-flex items-center text-sm text-white/40 hover:text-flame">
        ← back
      </Link>
      <Suspense fallback={<Skeleton />}>
        <DDView mint={mint} />
      </Suspense>
    </main>
  );
}

async function DDView({ mint }: { mint: string }) {
  const payload = await fetchDDData(mint);
  if (!payload.overview?.symbol) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="text-2xl font-semibold">Couldn’t resolve that mint</div>
        <p className="mt-2 text-white/60">
          Birdeye returned no token overview for{" "}
          <span className="font-mono text-flame">{mint}</span>. Double-check the
          address (or try a chain other than Solana via the MCP).
        </p>
      </div>
    );
  }

  const verdict = await generateVerdict(payload);
  const text = encodeURIComponent(
    `just ran $${payload.overview.symbol} through wingman 🦅\n\n${verdict.one_liner}\n\nwingman.app/t/${mint} #BirdeyeAPI`,
  );
  return (
    <>
      <DDCard payload={payload} verdict={verdict} />
      <div className="mt-6 flex items-center justify-center gap-3">
        <a
          href={`https://twitter.com/intent/tweet?text=${text}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-flame px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110"
        >
          Share on X →
        </a>
        <a
          href={`https://birdeye.so/token/${mint}?chain=solana`}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-flame hover:text-flame"
        >
          Open in Birdeye ↗
        </a>
      </div>
    </>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-white/10 bg-white/5 p-8">
      <div className="h-6 w-32 rounded bg-white/10" />
      <div className="mt-6 h-12 rounded bg-white/5" />
      <div className="mt-8 grid grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="mt-6 h-20 rounded-xl bg-white/5" />
    </div>
  );
}
