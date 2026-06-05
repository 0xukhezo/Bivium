import { ARBITRUM_TOKENS, type Token } from "./tokens";

export interface LendingAsset {
  token: Token;
  /** TODO: 1e18 bigint once chain reads land. Today: 0–1 annualized fraction. */
  ratePerSecond: number;
}

export interface LenderPreferences {
  lendingAssets: LendingAsset[];
  collateralAssets: Token[];
}

export interface LenderMarket {
  id: `0x${string}`;
  collateralToken: Token;
  loanToken: Token;
  creator: `0x${string}`;
  /** TODO: 1e18 bigint. */
  lltv: number;
  /** TODO: 1e18 bigint per-second. */
  ratePerSecond: number;
  totalBorrowAssets: { amount: number; usd: number };
  totalCollateral: { amount: number; usd: number };
  apyGenerated: number;
  status: "active" | "paused";
}

export const AVAILABLE_LEND_ASSETS: Token[] = [
  ARBITRUM_TOKENS.WBTC,
  ARBITRUM_TOKENS.ETH,
  ARBITRUM_TOKENS.USDC,
];

export const AVAILABLE_COLLATERAL_ASSETS: Token[] = [
  ARBITRUM_TOKENS.WBTC,
  ARBITRUM_TOKENS.ETH,
  ARBITRUM_TOKENS.USDC,
];

export const MOCK_LENDER_PREFERENCES: LenderPreferences = {
  lendingAssets: [
    { token: ARBITRUM_TOKENS.USDC, ratePerSecond: 0.05 },
    { token: ARBITRUM_TOKENS.ETH, ratePerSecond: 0.035 },
  ],
  collateralAssets: [ARBITRUM_TOKENS.WBTC, ARBITRUM_TOKENS.ETH],
};

const MOCK_LENDER_ADDR =
  `0x${"c".repeat(40)}` as `0x${string}`;

export const MOCK_LENDER_MARKETS: LenderMarket[] = [
  {
    id: `0x${"0".repeat(36)}0001`,
    collateralToken: ARBITRUM_TOKENS.WBTC,
    loanToken: ARBITRUM_TOKENS.USDC,
    creator: MOCK_LENDER_ADDR,
    lltv: 0.86,
    ratePerSecond: 0.05,
    totalBorrowAssets: { amount: 540_000, usd: 540_000 },
    totalCollateral: { amount: 12, usd: 840_000 },
    apyGenerated: 0.0475,
    status: "active",
  },
  {
    id: `0x${"0".repeat(36)}0002`,
    collateralToken: ARBITRUM_TOKENS.ETH,
    loanToken: ARBITRUM_TOKENS.USDC,
    creator: MOCK_LENDER_ADDR,
    lltv: 0.8,
    ratePerSecond: 0.045,
    totalBorrowAssets: { amount: 380_000, usd: 380_000 },
    totalCollateral: { amount: 145, usd: 507_500 },
    apyGenerated: 0.0418,
    status: "active",
  },
  {
    id: `0x${"0".repeat(36)}0003`,
    collateralToken: ARBITRUM_TOKENS.WBTC,
    loanToken: ARBITRUM_TOKENS.ETH,
    creator: MOCK_LENDER_ADDR,
    lltv: 0.75,
    ratePerSecond: 0.035,
    totalBorrowAssets: { amount: 0, usd: 0 },
    totalCollateral: { amount: 0, usd: 0 },
    apyGenerated: 0,
    status: "paused",
  },
];
