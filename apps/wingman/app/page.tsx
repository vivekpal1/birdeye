"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FEATURED = [
  { symbol: "BONK", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
  { symbol: "WIF",  mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" },
  { symbol: "JUP",  mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
];

export default function Landing() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function go(addr: string) {
    setLoading(true);
    router.push(`/t/${encodeURIComponent(addr.trim())}`);
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-white/60">
        <span className="size-1.5 rounded-full bg-flame" /> Powered by Birdeye Data + Claude
      </div>

      <h1 className="text-balance bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-bold leading-tight text-transparent sm:text-7xl">
        Paste a token.<br />Get the truth.
      </h1>

      <p className="mt-6 max-w-xl text-pretty text-base text-white/60 sm:text-lg">
        Wingman is your AI DD co-pilot. Drop any Solana mint and get a 3-second
        report — security, holders, momentum, verdict.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); if (input.trim()) go(input); }}
        className="mt-10 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur"
      >
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a Solana mint address…"
          className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="rounded-xl bg-flame px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-40"
        >
          {loading ? "…" : "DD it →"}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-white/40">
        <span>try:</span>
        {FEATURED.map((t) => (
          <button
            key={t.mint}
            onClick={() => go(t.mint)}
            className="rounded-full border border-white/10 px-3 py-1 font-mono text-white/70 transition hover:border-flame hover:text-flame"
          >
            ${t.symbol}
          </button>
        ))}
      </div>

      <footer className="mt-24 flex flex-col items-center gap-3 text-xs text-white/40">
        <p>
          🦅 also available as a Claude / Cursor MCP →{" "}
          <a className="text-flame hover:underline" href="https://github.com/vivekpal1/birdeye-mcp">
            @vivekpal1/birdeye-mcp
          </a>
        </p>
        <p className="text-white/30">
          Built for the Birdeye BIP Sprint 3 · #BirdeyeAPI
        </p>
      </footer>
    </main>
  );
}
