import { ARBITRUM_TOKENS, type Token } from "./tokens";

export interface Market {
  id: string;
  collateralToken: Token;
  loanToken: Token;
  lltv: number; // 0–1, e.g. 0.86 = 86%
  totalLiquidity: { amount: number; usd: number };
  totalBorrowed: { amount: number; usd: number };
  rate: number; // 0–1, annualized
}

// Placeholder reference prices used only to derive USD values for mock display.
// Real prices land via oracles when the contracts are wired.
const PRICES_USD: Record<string, number> = {
  USDC: 1,
  WBTC: 70_000,
  ETH: 3_500,
};

const TOKEN_PAIRS: Array<[Token, Token]> = [
  [ARBITRUM_TOKENS.WBTC, ARBITRUM_TOKENS.USDC],
  [ARBITRUM_TOKENS.ETH, ARBITRUM_TOKENS.USDC],
  [ARBITRUM_TOKENS.ETH, ARBITRUM_TOKENS.WBTC],
  [ARBITRUM_TOKENS.WBTC, ARBITRUM_TOKENS.ETH],
  [ARBITRUM_TOKENS.USDC, ARBITRUM_TOKENS.ETH],
  [ARBITRUM_TOKENS.USDC, ARBITRUM_TOKENS.WBTC],
];

const LLTVS = [0.7, 0.75, 0.8, 0.86, 0.91];

// Deterministic mock so SSR and hydration stay consistent.
export const MOCK_MARKETS: Market[] = Array.from({ length: 25 }, (_, i) => {
  const [collateral, loan] = TOKEN_PAIRS[i % TOKEN_PAIRS.length];
  const seed = (i * 37 + 11) % 100;
  const loanPrice = PRICES_USD[loan.symbol] ?? 1;
  const liqUsd = (100 + seed * 14) * 1_000_000;
  const utilization = 0.35 + ((seed * 7) % 50) / 100;
  const borrowUsd = liqUsd * utilization;

  return {
    id: `0x${"0".repeat(36)}${i.toString(16).padStart(4, "0")}`,
    collateralToken: collateral,
    loanToken: loan,
    lltv: LLTVS[seed % LLTVS.length],
    totalLiquidity: { amount: liqUsd / loanPrice, usd: liqUsd },
    totalBorrowed: { amount: borrowUsd / loanPrice, usd: borrowUsd },
    rate: 0.015 + ((seed * 3) % 60) / 1000,
  };
});
