import type { Token } from "./tokens";

// One borrower position. Amounts are bigint base units; lltv is 1e18
// fixed-point bigint; rates/HF/USD are display-only `number`s.
export interface BorrowerLoan {
  id: string;
  marketId: `0x${string}`;
  collateralToken: Token;
  loanToken: Token;
  /** Collateral base units. */
  collateral: { amount: bigint; usd: number | null };
  /** Morpho borrow shares — raw accounting bigint. */
  borrowShares: bigint;
  /** Total debt in loan-token base units (folds principal + accrued). */
  principal: { amount: bigint; usd: number | null };
  /** Always 0 today — the indexer collapses accrued into `principal`. */
  accruedInterest: { amount: bigint; usd: number | null };
  /** 1e18 fixed-point per-second rate. */
  ratePerSecond: bigint;
  /** 1e18 fixed-point loan-to-value cap. */
  lltv: bigint;
  /**
   * Indexer-derived health factor (off-chain prices). `null` when either
   * USD value is missing.
   */
  healthFactor: number | null;
  lender: string;
  /**
   * Oracle address from the on-chain `MarketParams` tuple. Required for
   * the Router's `keccak(MarketParams)` → marketId check on repay /
   * withdraw.
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
