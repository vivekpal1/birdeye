# @vivekpal1/birdeye-mcp

> **Give Claude eyes on Solana.** A Model Context Protocol server for [Birdeye Data](https://birdeye.so/) — onchain token, holder, security, and trending intelligence across **14 chains**, exposed as 12 first-class tools any MCP-compatible agent (Claude Desktop, Cursor, Claude Code, Windsurf, …) can call.

```
🦅 12 tools · 14 chains · free-tier friendly · streaming-ready
```

## Install

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "birdeye": {
      "command": "npx",
      "args": ["-y", "@vivekpal1/birdeye-mcp"],
      "env": {
        "BIRDEYE_API_KEY": "your_birdeye_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. Ask: *"Use Birdeye to tell me about $BONK and check if it's safe."*

### Cursor / Claude Code / Windsurf

Add to your `.mcp.json` (Cursor) or `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "birdeye": {
      "command": "npx",
      "args": ["-y", "@vivekpal1/birdeye-mcp"],
      "env": { "BIRDEYE_API_KEY": "your_key" }
    }
  }
}
```

### Get an API key

1. Visit [bds.birdeye.so](https://bds.birdeye.so/)
2. Sign in, generate a free key (30,000 CUs / month, plenty for personal agent use)
3. Premium tiers unlock wallet PnL, top-traders-per-token, top-10k holders, WebSockets

## Tools

| Tool | What it does |
|---|---|
| `get_token_overview` | Symbol, name, price, 24h change, mcap, liquidity, holder count, supply, links |
| `get_token_security` | Mint/freeze authority, top-10 concentration, transfer fees, Token-2022 flag |
| `get_token_creation` | Creation tx, slot, owner, block time — token age + provenance |
| `get_token_price` | Single price + liquidity |
| `get_multi_price` | Up to 100 token prices in one call (portfolio valuation) |
| `get_token_ohlcv` | Candle data for charting / momentum (1m → 1M intervals) |
| `get_token_trending` | Trending tokens, sorted by rank / volume / liquidity |
| `get_new_listings` | Recently-listed firehose (incl. pump.fun migrations) |
| `get_token_holders` | Top holders with balance and % of supply |
| `get_token_markets` | Pair overview: source DEX, base/quote, liquidity, 24h volume |
| `search_tokens` | Resolve tickers → mint addresses, across all chains |
| `list_supported_chains` | Enumerate Birdeye-supported networks |

All tools accept an optional `chain` parameter (default: `solana`). Supported: `solana, ethereum, arbitrum, avalanche, bsc, optimism, polygon, base, zksync, sui, monad, megaeth, fogo, aptos`.

## Programmatic use

The Birdeye REST client is also exported for any Node app:

```ts
import { BirdeyeClient } from "@vivekpal1/birdeye-mcp/client";

const client = new BirdeyeClient({ apiKey: process.env.BIRDEYE_API_KEY! });
const overview = await client.tokenOverview("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
```

The client includes a 60-second in-memory TTL cache so a chatty agent session doesn't melt the free tier (1 rps).

## Develop

```bash
git clone https://github.com/vivekpal1/birdeye-mcp
cd birdeye-mcp
pnpm install
pnpm build
BIRDEYE_API_KEY=... node dist/index.js   # speaks stdio
```

## Why this exists

The Birdeye API exposes data nobody else has — wallet PnL, top-trader-per-token, top-10k holder lists, multichain new-listing firehose. But none of it was reachable to the new wave of AI agents and IDE assistants. This MCP fixes that in one `npx` install.

Built for the [Birdeye BIP Sprint 3 competition](https://earn.superteam.fun/) (May 2026).

## License

MIT
