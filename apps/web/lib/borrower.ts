import { ARBITRUM_TOKENS, type Token } from "./tokens";

/**
 * A borrower's open position in a market. Field names mirror `positions`
 * + the joined `markets` row in `apps/indexer/ponder.schema.ts`.
 *
 * Today's split into `principal` + `accruedInterest` is a UI affordance only —
 * the indexer stores `borrowShares` and the market totals; debt is derived as
 * `borrowShares × totalBorrowAssets / totalBorrowShares`. Tomorrow we delete
 * the split and read from `borrowShares + marketId` exclusively. The seam is
 * already in place via the new `borrowShares` and `marketId` fields below.
 */
export interface BorrowerLoan {
  id: string;
  /** PK component on `positions(marketId, borrower)`. */
  marketId: `0x${string}`;
  collateralToken: Token;
  loanToken: Token;
  /** Matches `positions.collateral`. */
  collateral: { amount: number; usd: number };
  /**
   * TODO: tomorrow this becomes the source of truth (number → bigint, and
   * `principal + accruedInterest` are removed in favor of
   * `borrowShares × totalBorrowAssets / totalBorrowShares`).
   */
  borrowShares: number;
  /** TODO: delete tomorrow; folded into `borrowShares` math. */
  principal: { amount: number; usd: number };
  /** TODO: delete tomorrow; folded into `borrowShares` math. */
  accruedInterest: { amount: number; usd: number };
  /** TODO: 1e18 bigint per-second tomorrow. */
  ratePerSecond: number;
  /** TODO: 1e18 bigint tomorrow. */
  lltv: number;
  /** Derived: `(collateral_usd * lltv) / debt_usd`. Live oracle tomorrow. */
  healthFactor: number;
  /** Joins via `markets.creator` tomorrow. */
  lender: string;
}

// Health factor thresholds used across the borrower views.
export const HF_SAFE = 1.5;
export const HF_WARN = 1.2;

export function healthBand(hf: number): "safe" | "warn" | "danger" {
  if (hf >= HF_SAFE) return "safe";
  if (hf >= HF_WARN) return "warn";
  return "danger";
}

export const MOCK_BORROWER_LOANS: BorrowerLoan[] = [
  {
    id: `0x${"0".repeat(36)}b001`,
    marketId: `0x${"0".repeat(36)}b001`,
    collateralToken: ARBITRUM_TOKENS.WBTC,
    loanToken: ARBITRUM_TOKENS.USDC,
    collateral: { amount: 0.5, usd: 35_000 },
    // Seeded so debt-from-shares == principal + interest under the mock 1:1
    // shares↔assets ratio used by MOCK_MARKETS.
    borrowShares: 16_200 + 248,
    principal: { amount: 16_200, usd: 16_200 },
    accruedInterest: { amount: 248, usd: 248 },
    ratePerSecond: 0.045,
    lltv: 0.86,
    healthFactor: 1.83,
    lender: `0xa${"f".repeat(38).slice(0, 39)}`,
  },
  {
    id: `0x${"0".repeat(36)}b002`,
    marketId: `0x${"0".repeat(36)}b002`,
    collateralToken: ARBITRUM_TOKENS.ETH,
    loanToken: ARBITRUM_TOKENS.USDC,
    collateral: { amount: 8, usd: 28_000 },
    borrowShares: 15_400 + 95,
    principal: { amount: 15_400, usd: 15_400 },
    accruedInterest: { amount: 95, usd: 95 },
    ratePerSecond: 0.052,
    lltv: 0.8,
    healthFactor: 1.45,
    lender: `0xc${"1".repeat(39)}`,
  },
  {
    id: `0x${"0".repeat(36)}b003`,
    marketId: `0x${"0".repeat(36)}b003`,
    collateralToken: ARBITRUM_TOKENS.ETH,
    loanToken: ARBITRUM_TOKENS.WBTC,
    collateral: { amount: 5, usd: 17_500 },
    borrowShares: 0.18 + 0.002,
    principal: { amount: 0.18, usd: 12_600 },
    accruedInterest: { amount: 0.002, usd: 140 },
    ratePerSecond: 0.038,
    lltv: 0.75,
    healthFactor: 1.13,
    lender: `0xd${"3".repeat(39)}`,
  },
];
