import { arbitrum } from "wagmi/chains";
import type { Market } from "@/lib/markets";
import { getTokenByAddress, type Token } from "@/lib/tokens";
import { ratePerSecondToAnnual } from "@/lib/utils";
import { API_BASE } from "./client";

/**
 * Wire-format types — match the backend `/api/v1/markets` response exactly.
 * All bigint-valued fields arrive as decimal strings (`lltv`, `totalLiquidity`,
 * `totalBorrowed`, `bestRatePerSecond`). Convert at the boundary, never inline
 * in components. */

interface ApiMarketsResponse {
  message: string;
  data: {
    chainId: number;
    rows: ApiMarketRow[];
  };
}

interface ApiMarketRow {
  collateral: ApiToken;
  loan: ApiToken;
  /** 1e18 fixed-point fraction as a decimal string. */
  lltv: string;
  /** Base units of `loan` as a decimal string. */
  totalLiquidity: string;
  /** Base units of `loan` as a decimal string. */
  totalBorrowed: string;
  /** 1e18 per-second rate as a decimal string, or null when the orderbook is empty. */
  bestRatePerSecond: string | null;
}

interface ApiToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl: string;
  priceUsd: number;
}

// The list endpoint doesn't surface `oracle` / `creator` yet — those arrive
// when the indexer's detail endpoint lands. Until then the list view shows
// real liquidity / rates / pairs; the detail page falls back to mocks.
const ORACLE_PLACEHOLDER = `0x${"0".repeat(40)}` as const;
const CREATOR_PLACEHOLDER = `0x${"0".repeat(40)}` as const;

export async function fetchMarkets(opts?: {
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}): Promise<Market[]> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 100;
  const url = `${API_BASE}/markets?page=${page}&pageSize=${pageSize}`;

  const res = await fetch(url, {
    signal: opts?.signal,
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Markets fetch failed: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as ApiMarketsResponse;
  if (!body?.data?.rows) {
    throw new Error("Markets response missing data.rows");
  }
  return body.data.rows.map(adaptMarket);
}

function adaptMarket(row: ApiMarketRow): Market {
  const collateralToken = adaptToken(row.collateral);
  const loanToken = adaptToken(row.loan);

  const lltvBig = BigInt(row.lltv);
  // 1e18 fixed-point → 0..1 fraction. Safe for display; bigint precision
  // returns in the borrow / repay paths where the on-chain value is used.
  const lltv = Number(lltvBig) / 1e18;

  const totalSupplyBig = BigInt(row.totalLiquidity);
  const totalBorrowBig = BigInt(row.totalBorrowed);
  const denom = 10 ** loanToken.decimals;
  const supplyAmount = Number(totalSupplyBig) / denom;
  const borrowAmount = Number(totalBorrowBig) / denom;
  const supplyUsd = supplyAmount * row.loan.priceUsd;
  const borrowUsd = borrowAmount * row.loan.priceUsd;

  const ratePerSecond = row.bestRatePerSecond
    ? ratePerSecondToAnnual(BigInt(row.bestRatePerSecond))
    : 0;

  return {
    // Synthesize a stable per-pair id so React keys don't churn across
    // refetches. The true on-chain id is keccak(MarketParams) — that needs
    // `oracle` + `creator`, which the list endpoint doesn't currently emit.
    id: synthesizeId(collateralToken, loanToken),
    collateralToken,
    loanToken,
    oracle: ORACLE_PLACEHOLDER,
    creator: CREATOR_PLACEHOLDER,
    ratePerSecond,
    lltv,
    totalSupplyAssets: { amount: supplyAmount, usd: supplyUsd },
    totalBorrowAssets: { amount: borrowAmount, usd: borrowUsd },
    // The list endpoint doesn't yield shares either — the table never reads
    // them, but the Market shape requires the field. 1:1 with assets is a
    // safe filler until shares-driven UIs need it.
    totalSupplyShares: supplyAmount,
    totalBorrowShares: borrowAmount,
    lastAccrualTimestamp: 0,
  };
}

function adaptToken(t: ApiToken): Token {
  // Prefer the local registry's iconUrl when we know about the token — the
  // backend's `logoUrl` for some Arbitrum tokens (LINK, notably) 404s
  // because TrustWallet doesn't host them under the Arbitrum chain folder.
  // Local registry wins; for unknown tokens we fall through to the API's URL.
  const known = getTokenByAddress(t.address);
  return {
    address: t.address as `0x${string}`,
    symbol: t.symbol,
    name: t.name,
    decimals: t.decimals,
    chainId: arbitrum.id,
    iconUrl: known?.iconUrl ?? t.logoUrl,
  };
}

function synthesizeId(c: Token, l: Token): `0x${string}` {
  const seed = `${c.symbol}-${l.symbol}`.toLowerCase();
  const hex = Array.from(seed)
    .map((ch) => ch.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40)
    .padEnd(40, "0");
  return `0x${hex}` as `0x${string}`;
}
