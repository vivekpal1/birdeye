import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BirdeyeClient } from "../client.js";
import { SUPPORTED_CHAINS, type Chain } from "../client.js";

const ChainEnum = z.enum(SUPPORTED_CHAINS as [Chain, ...Chain[]]).optional()
  .describe("Chain to query. Defaults to 'solana'. Birdeye supports 14 networks; use list_supported_chains to enumerate.");

const Address = z.string().min(20).describe("Token contract address (mint on Solana, contract on EVM).");

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function fail(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: "text" as const, text: `Birdeye error: ${message}` }],
  };
}

export function registerBirdeyeTools(server: McpServer, client: BirdeyeClient) {
  server.tool(
    "get_token_overview",
    "Returns full token metadata for a single token: symbol, name, price, 24h change, liquidity, market cap, holder count, supply, links. Use this as a default 'tell me about token X' call.",
    { address: Address, chain: ChainEnum },
    async ({ address, chain }) => {
      try { return ok(await client.tokenOverview(address, chain)); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "get_token_security",
    "Returns Birdeye's security analysis for a token: mint authority, freeze authority, top-10 holder concentration %, transfer fee status, creator address, creation time, Token-2022 flag. Use this for rug-check / risk assessment.",
    { address: Address, chain: ChainEnum },
    async ({ address, chain }) => {
      try { return ok(await client.tokenSecurity(address, chain)); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "get_token_creation",
    "Returns the creation transaction info for a token: creation tx hash, slot, owner address, block time. Useful for assessing token age and provenance.",
    { address: Address, chain: ChainEnum },
    async ({ address, chain }) => {
      try { return ok(await client.tokenCreationInfo(address, chain)); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "get_token_price",
    "Returns the current USD price for a single token, with optional liquidity. Use get_multi_price for batches.",
    {
      address: Address,
      include_liquidity: z.boolean().default(true).describe("Include current liquidity USD."),
      chain: ChainEnum,
    },
    async ({ address, include_liquidity, chain }) => {
      try { return ok(await client.price(address, include_liquidity, chain)); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "get_multi_price",
    "Returns current USD prices for up to ~100 tokens in a single call. Use this for portfolio valuation or watchlists.",
    {
      addresses: z.array(z.string()).min(1).max(100).describe("Token addresses to fetch."),
      include_liquidity: z.boolean().default(false),
      chain: ChainEnum,
    },
    async ({ addresses, include_liquidity, chain }) => {
      try { return ok(await client.multiPrice(addresses, include_liquidity, chain)); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "get_token_ohlcv",
    "Returns OHLCV candles for charting and momentum analysis. Default 15m interval, default last 24h. Returns array of { unixTime, o, h, l, c, v }.",
    {
      address: Address,
      interval: z
        .enum(["1m","3m","5m","15m","30m","1H","2H","4H","6H","8H","12H","1D","3D","1W","1M"])
        .default("15m"),
      time_from: z.number().int().optional().describe("Unix seconds. Defaults to 24h ago."),
      time_to: z.number().int().optional().describe("Unix seconds. Defaults to now."),
      chain: ChainEnum,
    },
    async ({ address, interval, time_from, time_to, chain }) => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const to = time_to ?? now;
        const from = time_from ?? now - 86400;
        return ok(await client.ohlcv(address, interval, from, to, chain));
      } catch (e) { return fail(e); }
    },
  );

  server.tool(
    "get_token_trending",
    "Returns the current trending tokens on a given chain, sorted by Birdeye's trending rank, 24h volume, or liquidity.",
    {
      sort_by: z.enum(["rank", "volume24hUSD", "liquidity"]).default("rank"),
      limit: z.number().int().min(1).max(50).default(20),
      offset: z.number().int().min(0).default(0),
      chain: ChainEnum,
    },
    async ({ sort_by, limit, offset, chain }) => {
      try { return ok(await client.trending({ sortBy: sort_by, limit, offset }, chain)); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "get_new_listings",
    "Returns recently-listed tokens (the 'new listing firehose'). Includes pump.fun migrations when meme_platform_enabled is true. Useful for early discovery.",
    {
      meme_platform_enabled: z.boolean().default(true),
      limit: z.number().int().min(1).max(50).default(20),
      time_to: z.number().int().optional().describe("Unix seconds upper bound. Defaults to now."),
      chain: ChainEnum,
    },
    async ({ meme_platform_enabled, limit, time_to, chain }) => {
      try { return ok(await client.newListings({ memePlatformEnabled: meme_platform_enabled, limit, timeTo: time_to }, chain)); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "get_token_holders",
    "Returns the top holders of a token (largest first), with balance and percentage of supply. Use for whale concentration analysis. Free tier returns up to 10; higher tiers up to 10000.",
    {
      address: Address,
      limit: z.number().int().min(1).max(100).default(10),
      offset: z.number().int().min(0).default(0),
      chain: ChainEnum,
    },
    async ({ address, limit, offset, chain }) => {
      try { return ok(await client.tokenHolders(address, { limit, offset }, chain)); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "get_token_markets",
    "Returns the pair overview for a token's primary market: source DEX, base/quote, liquidity, 24h volume, unique wallets. Use to find where a token actually trades.",
    { address: Address, chain: ChainEnum },
    async ({ address, chain }) => {
      try { return ok(await client.pairOverview(address, chain)); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "search_tokens",
    "Search Birdeye's token catalog by symbol or name across all supported chains (or a specific one). Returns up to N matches with addresses, prices, and verification status. Use this to resolve a ticker like 'BONK' to a mint address.",
    {
      keyword: z.string().min(1).describe("Symbol, name, or partial match. Example: 'bonk', 'wif', 'pepe'."),
      limit: z.number().int().min(1).max(20).default(10),
      chain: z.enum(["all", ...SUPPORTED_CHAINS] as ["all", ...Chain[]]).default("all"),
    },
    async ({ keyword, limit, chain }) => {
      try { return ok(await client.search(keyword, { limit, chain })); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "list_supported_chains",
    "Returns the list of chains Birdeye supports. Useful for the model to know what 'chain' values are valid for the other tools.",
    {},
    async () => ok({ chains: SUPPORTED_CHAINS, default: "solana" }),
  );
}

export const TOOL_NAMES = [
  "get_token_overview",
  "get_token_security",
  "get_token_creation",
  "get_token_price",
  "get_multi_price",
  "get_token_ohlcv",
  "get_token_trending",
  "get_new_listings",
  "get_token_holders",
  "get_token_markets",
  "search_tokens",
  "list_supported_chains",
] as const;
