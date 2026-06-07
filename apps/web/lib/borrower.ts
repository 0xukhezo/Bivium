import type { Token } from "./tokens";

export interface BorrowerLoan {
  id: string;
  marketId: `0x${string}`;
  collateralToken: Token;
  loanToken: Token;
  collateral: { amount: number; usd: number };
  /** TODO: source of truth once indexer is wired. */
  borrowShares: number;
  /** TODO: delete once `borrowShares × totalBorrowAssets / totalBorrowShares` math lands. */
  principal: { amount: number; usd: number };
  /** TODO: delete; folded into `borrowShares` math. */
  accruedInterest: { amount: number; usd: number };
  /** TODO: 1e18 bigint per-second. */
  ratePerSecond: number;
  /** TODO: 1e18 bigint. */
  lltv: number;
  /**
   * Derived: `(collateral_usd * lltv) / debt_usd`. `null` when either USD
   * value is missing (no price feed for that token in the indexer).
   */
  healthFactor: number | null;
  lender: string;
  /**
   * Oracle address from the on-chain `MarketParams` tuple. Indexer sources
   * this from the `CreateMarket` event so the FE never has to derive it.
   * Required for the Router's `keccak(MarketParams)` → marketId check on
   * repay / withdraw.
   */
  oracle: `0x${string}`;
}

export const HF_SAFE = 1.5;
export const HF_WARN = 1.2;

export function healthBand(hf: number): "safe" | "warn" | "danger" {
  if (hf >= HF_SAFE) return "safe";
  if (hf >= HF_WARN) return "warn";
  return "danger";
}

