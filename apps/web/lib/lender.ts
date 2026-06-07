import { ARBITRUM_TOKENS, type Token } from "./tokens";

export interface LendingAsset {
  token: Token;
  /** Annual fraction (0–1), derived for display. The on-chain truth is
   *  the lender's `BiviumProfile.getRate(loanToken)` 1e18 bigint. */
  ratePerSecond: number;
}

export interface LenderPreferences {
  lendingAssets: LendingAsset[];
  collateralAssets: Token[];
}

// Row in the Lender tab's "Your markets" table. Amounts are bigint base
// units; rates / lltv are 1e18 fixed-point bigint.
export interface LenderMarket {
  id: `0x${string}`;
  collateralToken: Token;
  loanToken: Token;
  creator: `0x${string}`;
  /** 1e18 fixed-point loan-to-value cap. */
  lltv: bigint;
  /** 1e18 fixed-point per-second rate. */
  ratePerSecond: bigint;
  /** `amount` is loan-token base units. */
  totalBorrowAssets: { amount: bigint; usd: number | null };
  /** `amount` is collateral-token base units. */
  totalCollateral: { amount: bigint; usd: number | null };
  /** Annual fraction (0–1), derived from `ratePerSecond` for display. */
  apyGenerated: number;
  status: "active" | "paused";
}

export const AVAILABLE_LEND_ASSETS: Token[] = [
  ARBITRUM_TOKENS.WBTC,
  ARBITRUM_TOKENS.WETH,
  ARBITRUM_TOKENS.USDC,
  ARBITRUM_TOKENS.LINK,
];

export const AVAILABLE_COLLATERAL_ASSETS: Token[] = [
  ARBITRUM_TOKENS.WBTC,
  ARBITRUM_TOKENS.WETH,
  ARBITRUM_TOKENS.USDC,
  ARBITRUM_TOKENS.LINK,
];
