import { TtlCache } from "./cache.js";

const BASE_URL = "https://public-api.birdeye.so";

export type Chain =
  | "solana"
  | "ethereum"
  | "arbitrum"
  | "avalanche"
  | "bsc"
  | "optimism"
  | "polygon"
  | "base"
  | "zksync"
  | "sui"
  | "monad"
  | "megaeth"
  | "fogo"
  | "aptos";

export const SUPPORTED_CHAINS: Chain[] = [
  "solana", "ethereum", "arbitrum", "avalanche", "bsc",
  "optimism", "polygon", "base", "zksync", "sui",
  "monad", "megaeth", "fogo", "aptos",
];

export interface BirdeyeClientOptions {
  apiKey: string;
  defaultChain?: Chain;
  cacheTtlMs?: number;
  fetchImpl?: typeof fetch;
  /** Minimum gap between outbound requests, ms. Defaults to 1100 to respect Birdeye's 1 rps free tier. */
  minRequestSpacingMs?: number;
}

export class BirdeyeError extends Error {
  constructor(public status: number, public endpoint: string, message: string) {
    super(`Birdeye ${status} on ${endpoint}: ${message}`);
    this.name = "BirdeyeError";
  }
}

interface BirdeyeEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

export class BirdeyeClient {
  private cache: TtlCache<unknown>;
  private fetchImpl: typeof fetch;
  private defaultChain: Chain;
  private inflight = new Map<string, Promise<unknown>>();
  private nextAvailableAt = 0;
  private spacingMs: number;

  constructor(private opts: BirdeyeClientOptions) {
    if (!opts.apiKey) {
      throw new Error("BIRDEYE_API_KEY is required. Get one at https://bds.birdeye.so/");
    }
    this.cache = new TtlCache(opts.cacheTtlMs ?? 60_000);
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.defaultChain = opts.defaultChain ?? "solana";
    this.spacingMs = opts.minRequestSpacingMs ?? 1100;
  }

  private async waitForSlot(): Promise<void> {
    const now = Date.now();
    const waitMs = this.nextAvailableAt > now ? this.nextAvailableAt - now : 0;
    this.nextAvailableAt = Math.max(now, this.nextAvailableAt) + this.spacingMs;
    if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
  }

  private async request<T>(
    path: string,
    params: Record<string, string | number | boolean | undefined> = {},
    chain?: Chain,
  ): Promise<T> {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) search.set(k, String(v));
    }
    const qs = search.toString();
    const url = `${BASE_URL}${path}${qs ? `?${qs}` : ""}`;
    const targetChain = chain ?? this.defaultChain;
    const cacheKey = `${targetChain}|${url}`;

    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) return cached as T;

    // Coalesce duplicate concurrent calls — common in dev (React Strict Mode renders twice).
    const existing = this.inflight.get(cacheKey);
    if (existing) return existing as Promise<T>;

    const p = (async (): Promise<T> => {
      await this.waitForSlot();
      const res = await this.fetchImpl(url, {
        headers: {
          accept: "application/json",
          "x-api-key": this.opts.apiKey,
          "x-chain": targetChain,
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new BirdeyeError(res.status, path, body.slice(0, 300));
      }

      const json = (await res.json()) as BirdeyeEnvelope<T>;
      if (json.success === false) {
        throw new BirdeyeError(200, path, json.message ?? "request returned success=false");
      }
      const data = (json.data ?? json) as T;
      this.cache.set(cacheKey, data);
      return data;
    })();

    this.inflight.set(cacheKey, p);
    try {
      return await p;
    } finally {
      this.inflight.delete(cacheKey);
    }
  }

  // --- Token overview / metadata ---
  tokenOverview(address: string, chain?: Chain) {
    return this.request<TokenOverview>("/defi/token_overview", { address }, chain);
  }

  tokenSecurity(address: string, chain?: Chain) {
    return this.request<TokenSecurity>("/defi/token_security", { address }, chain);
  }

  tokenCreationInfo(address: string, chain?: Chain) {
    return this.request<TokenCreationInfo>("/defi/token_creation_info", { address }, chain);
  }

  // --- Pricing ---
  price(address: string, includeLiquidity = true, chain?: Chain) {
    return this.request<TokenPrice>("/defi/price", { address, include_liquidity: includeLiquidity }, chain);
  }

  multiPrice(addresses: string[], includeLiquidity = false, chain?: Chain) {
    return this.request<Record<string, TokenPrice>>(
      "/defi/multi_price",
      { list_address: addresses.join(","), include_liquidity: includeLiquidity },
      chain,
    );
  }

  ohlcv(
    address: string,
    type: OhlcvInterval = "15m",
    timeFrom?: number,
    timeTo?: number,
    chain?: Chain,
  ) {
    return this.request<{ items: OhlcvCandle[] }>(
      "/defi/ohlcv",
      { address, type, time_from: timeFrom, time_to: timeTo },
      chain,
    );
  }

  // --- Discovery ---
  trending(opts: { sortBy?: "rank" | "volume24hUSD" | "liquidity"; limit?: number; offset?: number } = {}, chain?: Chain) {
    return this.request<{ tokens: TrendingToken[] }>(
      "/defi/v2/tokens/trending",
      { sort_by: opts.sortBy ?? "rank", sort_type: "asc", offset: opts.offset ?? 0, limit: opts.limit ?? 20 },
      chain,
    );
  }

  newListings(opts: { timeTo?: number; memePlatformEnabled?: boolean; limit?: number } = {}, chain?: Chain) {
    return this.request<{ items: NewListing[] }>(
      "/defi/v2/tokens/new_listing",
      { time_to: opts.timeTo, meme_platform_enabled: opts.memePlatformEnabled ?? true, limit: opts.limit ?? 20 },
      chain,
    );
  }

  search(keyword: string, opts: { limit?: number; chain?: "all" | Chain } = {}) {
    return this.request<{ items: SearchResult[] }>(
      "/defi/v3/search",
      { keyword, target: "token", chain: opts.chain ?? "all", limit: opts.limit ?? 10 },
    );
  }

  // --- Holders ---
  tokenHolders(address: string, opts: { offset?: number; limit?: number } = {}, chain?: Chain) {
    return this.request<{ items: HolderEntry[] }>(
      "/defi/v3/token/holder",
      { address, offset: opts.offset ?? 0, limit: opts.limit ?? 10 },
      chain,
    );
  }

  // --- Markets / pairs ---
  pairOverview(address: string, chain?: Chain) {
    return this.request<PairOverview>("/defi/v3/pair/overview/single", { address }, chain);
  }
}

// --- Types (best-effort; Birdeye returns more fields than typed here) ---
export type OhlcvInterval =
  | "1m" | "3m" | "5m" | "15m" | "30m"
  | "1H" | "2H" | "4H" | "6H" | "8H" | "12H"
  | "1D" | "3D" | "1W" | "1M";

export interface TokenOverview {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  liquidity?: number;
  price?: number;
  priceChange24hPercent?: number;
  v24hUSD?: number;
  v24hChangePercent?: number;
  marketCap?: number;
  fdv?: number;
  numberMarkets?: number;
  holder?: number;
  totalSupply?: number;
  circulatingSupply?: number;
  uniqueWallet24h?: number;
  lastTradeUnixTime?: number;
  extensions?: {
    website?: string;
    twitter?: string;
    discord?: string;
    description?: string;
    coingeckoId?: string;
  };
}

export interface TokenSecurity {
  creatorAddress?: string;
  creationTime?: number;
  ownerAddress?: string | null;
  freezeAuthority?: string | null;
  mintAuthority?: string | null;
  isToken2022?: boolean;
  isTrueToken?: boolean;
  totalSupply?: number;
  top10HolderBalance?: number;
  top10HolderPercent?: number;
  top10UserBalance?: number;
  top10UserPercent?: number;
  transferFeeEnable?: boolean | null;
  transferFeeData?: unknown;
  metaplexUpdateAuthority?: string;
  preMarketHolder?: string[];
}

export interface TokenCreationInfo {
  txHash?: string;
  slot?: number;
  tokenAddress?: string;
  decimals?: number;
  owner?: string;
  blockUnixTime?: number;
  blockHumanTime?: string;
}

export interface TokenPrice {
  value?: number;
  updateUnixTime?: number;
  updateHumanTime?: string;
  liquidity?: number;
  priceChange24h?: number;
}

export interface OhlcvCandle {
  unixTime: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  address?: string;
  type?: string;
}

export interface TrendingToken {
  address: string;
  symbol: string;
  name: string;
  rank?: number;
  liquidity?: number;
  price?: number;
  volume24hUSD?: number;
  marketcap?: number;
  decimals?: number;
  logoURI?: string;
}

export interface NewListing {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  liquidity?: number;
  liquidityAddedAt?: string;
  source?: string;
}

export interface SearchResult {
  address: string;
  symbol: string;
  name: string;
  decimals?: number;
  network?: string;
  liquidity?: number;
  price?: number;
  marketCap?: number;
  logoURI?: string;
  verified?: boolean;
}

export interface HolderEntry {
  amount: string;
  decimals: number;
  mint: string;
  owner: string;
  token_account: string;
  ui_amount?: number;
  percentage?: number;
}

export interface PairOverview {
  address: string;
  source: string;
  base: { address: string; symbol: string; decimals: number };
  quote: { address: string; symbol: string; decimals: number };
  liquidity?: number;
  liquidityAddedAt?: string;
  price?: number;
  v24hUSD?: number;
  trade24h?: number;
  uniqueWallet24h?: number;
}
