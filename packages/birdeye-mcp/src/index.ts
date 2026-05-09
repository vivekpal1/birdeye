#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BirdeyeClient, type Chain, SUPPORTED_CHAINS } from "./client.js";
import { registerBirdeyeTools } from "./tools/index.js";

export { BirdeyeClient, SUPPORTED_CHAINS };
export type { Chain };
export { registerBirdeyeTools };

async function main() {
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) {
    console.error(
      "[birdeye-mcp] BIRDEYE_API_KEY is not set.\n" +
      "  Get a free key at https://bds.birdeye.so/ and set it in your MCP client config.\n" +
      "  Example (Claude Desktop):\n" +
      '    "birdeye": {\n' +
      '      "command": "npx",\n' +
      '      "args": ["-y", "@vivekpal1/birdeye-mcp"],\n' +
      '      "env": { "BIRDEYE_API_KEY": "your_key_here" }\n' +
      "    }",
    );
    process.exit(1);
  }

  const defaultChainEnv = (process.env.BIRDEYE_DEFAULT_CHAIN ?? "solana").toLowerCase() as Chain;
  const defaultChain = (SUPPORTED_CHAINS as readonly string[]).includes(defaultChainEnv)
    ? defaultChainEnv
    : "solana";

  const client = new BirdeyeClient({ apiKey, defaultChain });

  const server = new McpServer({
    name: "birdeye-mcp",
    version: "0.1.0",
  });

  registerBirdeyeTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[birdeye-mcp] connected. default_chain=${defaultChain}`);
}

main().catch((err) => {
  console.error("[birdeye-mcp] fatal:", err);
  process.exit(1);
});
