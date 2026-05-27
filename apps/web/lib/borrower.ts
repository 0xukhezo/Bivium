import { ARBITRUM_TOKENS, type Token } from "./tokens";

export interface BorrowerLoan {
  id: string;
  collateralToken: Token;
  loanToken: Token;
  collateralPosted: { amount: number; usd: number };
  principal: { amount: number; usd: number };
  accruedInterest: { amount: number; usd: number };
  rate: number;
  lltv: number;
  healthFactor: number; // (collateral_usd * lltv) / debt_usd
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
    collateralToken: ARBITRUM_TOKENS.WBTC,
    loanToken: ARBITRUM_TOKENS.USDC,
    collateralPosted: { amount: 0.5, usd: 35_000 },
    principal: { amount: 16_200, usd: 16_200 },
    accruedInterest: { amount: 248, usd: 248 },
    rate: 0.045,
    lltv: 0.86,
    healthFactor: 1.83,
    lender: `0xa${"f".repeat(38).slice(0, 39)}`,
  },
  {
    id: `0x${"0".repeat(36)}b002`,
    collateralToken: ARBITRUM_TOKENS.ETH,
    loanToken: ARBITRUM_TOKENS.USDC,
    collateralPosted: { amount: 8, usd: 28_000 },
    principal: { amount: 15_400, usd: 15_400 },
    accruedInterest: { amount: 95, usd: 95 },
    rate: 0.052,
    lltv: 0.8,
    healthFactor: 1.45,
    lender: `0xc${"1".repeat(39)}`,
  },
  {
    id: `0x${"0".repeat(36)}b003`,
    collateralToken: ARBITRUM_TOKENS.ETH,
    loanToken: ARBITRUM_TOKENS.WBTC,
    collateralPosted: { amount: 5, usd: 17_500 },
    principal: { amount: 0.18, usd: 12_600 },
    accruedInterest: { amount: 0.002, usd: 140 },
    rate: 0.038,
    lltv: 0.75,
    healthFactor: 1.13,
    lender: `0xd${"3".repeat(39)}`,
  },
];
