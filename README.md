# 🦅 Wingman + Birdeye MCP

> **Give Claude eyes on Solana.** Two pieces, one mission.

| | |
|---|---|
| **[Wingman](apps/wingman)** | Paste any Solana mint → get a 3-second AI-powered DD card. Shareable on X. |
| **[@vivekpal1/birdeye-mcp](packages/birdeye-mcp)** | A Model Context Protocol server that wires Birdeye Data into Claude Desktop, Cursor, Claude Code, Windsurf, or any MCP-compatible agent. 12 tools, 14 chains. |

The MCP is the moat — anyone can run it locally and ask Claude about onchain data. Wingman is the demo: a hosted UI that uses the *same* tools to render a viral, X-shareable DD card.

```
🟢 LOOKS_CLEAN          🟡 PROCEED_WITH_CAUTION          🔴 HIGH_RISK / 💀 LIKELY_RUG
```

## Built for

- **[Birdeye BIP Sprint 3 Competition](https://superteam.fun/)** (May 2 – May 9, 2026)
- Hits all four scoring axes: **Technical Depth** (real MCP server), **Product Utility** (drop-in DD tool), **Community Support** (X-native share cards), **Presentation** (open-source, well-documented).

## Why an MCP?

Birdeye's brief explicitly named "AI agents" as a target category, but the only existing Birdeye MCP at the time of this build was an abandoned 0-star repo with 3 thin tools. The crypto MCP space is hot — Bybit and Whale.io both shipped MCPs in April 2026 — and Smithery + Claude Desktop is now the fastest distribution channel for crypto data tools.

So: **a polished, multichain Birdeye MCP with 12 well-documented tools, free-tier friendly, available on npm in one line**.

## Repo layout

```
birdeye/
├── packages/
│   └── birdeye-mcp/     ← the MCP server (TypeScript, npm-publishable)
└── apps/
    └── wingman/         ← the consumer demo (Next.js, Vercel-deployable)
```

The web app imports the MCP's `BirdeyeClient` via the workspace, so there is exactly one Birdeye REST integration in this repo. The MCP exposes it to LLMs over stdio; Wingman exposes it to humans over HTTPS.

## Quickstart

### 1. Use the MCP yourself

```bash
# Claude Desktop config
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

Restart Claude. Ask: *"Use Birdeye to find the top 5 trending Solana tokens, then run a security check on each."*

### 2. Run Wingman locally

```bash
git clone https://github.com/vivekpal1/birdeye-mcp
cd birdeye-mcp
pnpm install
pnpm build:mcp                      # build the workspace package
cp .env.example .env                # add BIRDEYE_API_KEY + ANTHROPIC_API_KEY
pnpm dev:web                        # http://localhost:3000
```

Visit `localhost:3000`, paste any Solana mint (try `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263` for BONK), get a DD card.

## Birdeye endpoints used

(Sprint submission requires us to list these.) The MCP and Wingman together call:

- `/defi/token_overview`
- `/defi/token_security`
- `/defi/token_creation_info`
- `/defi/price`
- `/defi/multi_price`
- `/defi/ohlcv`
- `/defi/v2/tokens/trending`
- `/defi/v2/tokens/new_listing`
- `/defi/v3/token/holder`
- `/defi/v3/pair/overview/single`
- `/defi/v3/search`

All free-tier compatible. Wingman additionally calls Anthropic's API to generate the verdict.

## License

MIT
