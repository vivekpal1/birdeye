# Birdeye BIP Sprint 3 — Submission

**Project name:** Wingman + @vivekpal1/birdeye-mcp
**Tagline:** Give Claude eyes on Solana.

---

## Description (paste into Superteam Earn)

Two open-source pieces, designed to win on every scoring axis:

**1. `@vivekpal1/birdeye-mcp`** — a Model Context Protocol server that exposes 12 Birdeye tools to Claude Desktop, Cursor, Claude Code, Windsurf, and any MCP-compatible AI agent. Multichain (14 networks). Free-tier friendly, with built-in caching to survive Birdeye's 1 rps limit. Installable in one line: `npx -y @vivekpal1/birdeye-mcp`.

The brief explicitly named "AI agents" as a target category — but the only Birdeye MCP that existed before this build was an abandoned 0-star repo with 3 thin tools. We shipped the polished one.

**2. Wingman** — a hosted Next.js demo that uses the same Birdeye client to deliver a 3-second, AI-powered DD card for any Solana token. Paste a mint → get verdict, security flags, top-10 holder concentration, 24h sparkline, and an X-shareable OG card. The card is the marketing: every share is a Birdeye-branded asset that links back to the tool.

The two pieces share one Birdeye REST client via a pnpm workspace — so the demo is literally a hosted UI for the MCP.

## Birdeye endpoints used

All endpoints are wrapped by the shared `BirdeyeClient` (`packages/birdeye-mcp/src/client.ts`) and exposed both as MCP tools and as the data layer behind Wingman's DD card.

- **`/defi/token_overview`** — primary token snapshot: name, symbol, price, market cap, liquidity, 24h volume/price change. Drives the headline stats on the Wingman DD card and the `birdeye_token_overview` MCP tool.
- **`/defi/token_security`** — risk signals (mint/freeze authority, top-10 holder %, LP lock status, transfer-fee flags). Powers Wingman's red/yellow/green verdict and the `birdeye_token_security` tool Claude uses to answer "is this token safe?".
- **`/defi/token_creation_info`** — creator wallet, deploy tx, and creation timestamp. Used to show token age on the card and let Claude reason about how fresh a launch is.
- **`/defi/price`** — single-token spot price with optional liquidity. Lightweight check used by the MCP for quick "what is X worth right now?" queries without pulling the full overview.
- **`/defi/multi_price`** — batched price lookup for up to 100 mints in one call. Lets Claude price an entire wallet or watchlist in a single tool call instead of N round-trips (critical under the 1 rps free-tier cap).
- **`/defi/ohlcv`** — candle history across multiple timeframes. Feeds the 24h sparkline rendered into the OG share card and gives Claude trend data for technical context.
- **`/defi/v2/tokens/trending`** — current trending tokens on a chain. Surfaced as the `birdeye_trending_tokens` tool so Claude can answer "what's hot on Solana right now?".
- **`/defi/v2/tokens/new_listing`** — newly listed tokens. Powers a "new launches" feed for degens hunting fresh mints from inside Claude.
- **`/defi/v3/token/holder`** — paginated holder list with balances. Wingman computes the top-10 concentration % from this; Claude uses it to flag whale-dominated supplies.
- **`/defi/v3/pair/overview/single`** — per-pool stats (DEX, reserves, fees, 24h volume). Used to answer "which pool has the real liquidity?" and to validate that a token's headline liquidity isn't a single thin pair.
- **`/defi/v3/search`** — fuzzy search by name, symbol, or address across all supported chains. Lets users (and Claude) resolve a ticker to a mint before calling any of the address-based endpoints above.

## Links

- **GitHub:** https://github.com/vivekpal1/birdeye-mcp _(monorepo: MCP + Wingman)_
- **Demo:** https://wingman.app
- **MCP on npm:** https://www.npmjs.com/package/@vivekpal1/birdeye-mcp
- **MCP on Smithery:** https://smithery.ai/server/@vivekpal1/birdeye-mcp
- **Demo video:** _(Loom link)_
- **X launch thread:** _(post URL)_

## Why we win each axis

- **Community Support (X engagement):** Wingman is built around a viral primitive — the OG share card. Every DD share creates a 1200×630 PNG with the Birdeye + Wingman branding and a pre-filled tweet. Built-in #BirdeyeAPI hashtag.
- **Product Utility:** the MCP is forever-useful infra — anyone can install and use it daily. Wingman is the lazy default for the "is this token safe?" question every Solana trader asks 10× a day.
- **Technical Depth:** real engineering — typed TS client with caching, 12 well-documented MCP tools with Zod schemas, structured-output Claude prompts (`generateObject` + Zod), shared workspace package, OG image route with Satori.
- **Presentation:** monorepo open source, two READMEs, distribution via npm + Smithery + Claude Desktop config, demo video, X thread.

## Sprint 3 hashtag and tags

`#BirdeyeAPI` · @birdeye_data
