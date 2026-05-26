import { ARBITRUM_TOKENS, type Token } from "./tokens";

export interface LendingAsset {
  token: Token;
  rate: number; // 0–1, e.g. 0.05 = 5%
}

export interface LenderPreferences {
  lendingAssets: LendingAsset[];
  collateralAssets: Token[];
}

export interface LenderMarket {
  id: string;
  collateralToken: Token;
  loanToken: Token;
  lltv: number;
  rate: number;
  onLoan: { amount: number; usd: number };
  collateral: { amount: number; usd: number };
  apyGenerated: number;
  status: "active" | "paused";
}

// Backend-provided lists of assets a lender may lend / accept as collateral.
// Same three tokens for now; real lists arrive when the backend is wired.
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

// Current lender state (what's "persisted on-chain" in mock terms).
export const MOCK_LENDER_PREFERENCES: LenderPreferences = {
  lendingAssets: [
    { token: ARBITRUM_TOKENS.USDC, rate: 0.05 },
    { token: ARBITRUM_TOKENS.ETH, rate: 0.035 },
  ],
  collateralAssets: [ARBITRUM_TOKENS.WBTC, ARBITRUM_TOKENS.ETH],
};

export const MOCK_LENDER_MARKETS: LenderMarket[] = [
  {
    id: `0x${"0".repeat(36)}0001`,
    collateralToken: ARBITRUM_TOKENS.WBTC,
    loanToken: ARBITRUM_TOKENS.USDC,
    lltv: 0.86,
    rate: 0.05,
    onLoan: { amount: 540_000, usd: 540_000 },
    collateral: { amount: 12, usd: 840_000 },
    apyGenerated: 0.0475,
    status: "active",
  },
  {
    id: `0x${"0".repeat(36)}0002`,
    collateralToken: ARBITRUM_TOKENS.ETH,
    loanToken: ARBITRUM_TOKENS.USDC,
    lltv: 0.8,
    rate: 0.045,
    onLoan: { amount: 380_000, usd: 380_000 },
    collateral: { amount: 145, usd: 507_500 },
    apyGenerated: 0.0418,
    status: "active",
  },
  {
    id: `0x${"0".repeat(36)}0003`,
    collateralToken: ARBITRUM_TOKENS.WBTC,
    loanToken: ARBITRUM_TOKENS.ETH,
    lltv: 0.75,
    rate: 0.035,
    onLoan: { amount: 0, usd: 0 },
    collateral: { amount: 0, usd: 0 },
    apyGenerated: 0,
    status: "paused",
  },
];
