import { ARBITRUM_TOKENS, type Token } from "./tokens";

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
  /** Derived: `(collateral_usd * lltv) / debt_usd`. */
  healthFactor: number;
  lender: string;
}

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
