import { ARBITRUM_TOKENS, type Token } from "./tokens";

export interface Market {
  id: `0x${string}`;
  collateralToken: Token;
  loanToken: Token;
  oracle: `0x${string}`;
  creator: `0x${string}`;
  /** TODO: 1e18 bigint once chain reads land. Today: 0–1 annualized fraction. */
  ratePerSecond: number;
  /** TODO: 1e18 bigint once chain reads land. Today: 0–1 fraction. */
  lltv: number;
  totalSupplyAssets: { amount: number; usd: number };
  totalBorrowAssets: { amount: number; usd: number };
  totalSupplyShares: number;
  totalBorrowShares: number;
  /** Unix seconds. */
  lastAccrualTimestamp: number;
}

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

const MOCK_ORACLE: `0x${string}` = `0x${"0".repeat(40)}` as `0x${string}`;

const NOW = Math.floor(Date.now() / 1000);

export const MOCK_MARKETS: Market[] = TOKEN_PAIRS.map(([collateral, loan], i) => {
  const seed = (i * 37 + 11) % 100;
  const loanPrice = PRICES_USD[loan.symbol] ?? 1;
  const liqUsd = (100 + seed * 14) * 1_000_000;
  const utilization = 0.35 + ((seed * 7) % 50) / 100;
  const borrowUsd = liqUsd * utilization;
  const idSuffix = i.toString(16).padStart(4, "0");
  const creator = `0x${"c".repeat(36)}${idSuffix}` as `0x${string}`;
  const supplyAmount = liqUsd / loanPrice;
  const borrowAmount = borrowUsd / loanPrice;

  return {
    id: `0x${"0".repeat(36)}${idSuffix}` as `0x${string}`,
    collateralToken: collateral,
    loanToken: loan,
    oracle: MOCK_ORACLE,
    creator,
    ratePerSecond: 0.015 + ((seed * 3) % 60) / 1000,
    lltv: LLTVS[seed % LLTVS.length],
    totalSupplyAssets: { amount: supplyAmount, usd: liqUsd },
    totalBorrowAssets: { amount: borrowAmount, usd: borrowUsd },
    totalSupplyShares: supplyAmount,
    totalBorrowShares: borrowAmount,
    lastAccrualTimestamp: NOW,
  };
});

export function getMarketById(id: string): Market | undefined {
  const needle = id.toLowerCase();
  return MOCK_MARKETS.find((m) => m.id.toLowerCase() === needle);
}

export function getMarketSlug(market: Market): string {
  return `${market.collateralToken.symbol}-${market.loanToken.symbol}`.toLowerCase();
}

export function getMarketByPair(pair: string): Market | undefined {
  const needle = pair.toLowerCase();
  return MOCK_MARKETS.find(
    (m) =>
      `${m.collateralToken.symbol}-${m.loanToken.symbol}`.toLowerCase() ===
      needle,
  );
}
