import type { Token } from "./tokens";

// Live shape; the API adapter in `lib/api/markets.ts` produces these.
// Base-unit amounts are bigint; rates/lltv are 1e18 fixed-point bigint;
// USD values are JS numbers (lossy, display only).
export interface Market {
  id: `0x${string}`;
  collateralToken: Token;
  loanToken: Token;
  oracle: `0x${string}`;
  creator: `0x${string}`;
  /** 1e18 fixed-point per-second rate. */
  ratePerSecond: bigint;
  /** 1e18 fixed-point loan-to-value cap. */
  lltv: bigint;
  /** `amount` is loan-token base units; `usd` is `null` when no price. */
  totalSupplyAssets: { amount: bigint; usd: number | null };
  totalBorrowAssets: { amount: bigint; usd: number | null };
  /** Raw Morpho-style share accounting. */
  totalSupplyShares: bigint;
  totalBorrowShares: bigint;
  /** Unix seconds. */
  lastAccrualTimestamp: number;
  /** Indexer-curated USD price for the loan token. `null` when missing. */
  loanPriceUsd: number | null;
  /** Indexer-curated USD price for the collateral token. `null` when missing. */
  collateralPriceUsd: number | null;
}

export function getMarketSlug(market: Market): string {
  return `${market.collateralToken.symbol}-${market.loanToken.symbol}`.toLowerCase();
}
