import { arbitrum } from "wagmi/chains";

export interface Token {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  iconUrl: string;
}

const TRUSTWALLET_ARB =
  "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets";

// Arbitrum One canonical addresses. "ETH" maps to WETH since native ETH has no
// ERC-20 address — borrowing/lending flows always touch the wrapped contract.
export const ARBITRUM_TOKENS = {
  WBTC: {
    address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    symbol: "WBTC",
    name: "Wrapped BTC",
    decimals: 8,
    chainId: arbitrum.id,
    iconUrl: `${TRUSTWALLET_ARB}/0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f/logo.png`,
  },
  ETH: {
    address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    symbol: "ETH",
    name: "Ether",
    decimals: 18,
    chainId: arbitrum.id,
    iconUrl: `${TRUSTWALLET_ARB}/0x82aF49447D8a07e3bd95BD0d56f35241523fBab1/logo.png`,
  },
  USDC: {
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    chainId: arbitrum.id,
    iconUrl: `${TRUSTWALLET_ARB}/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png`,
  },
} as const satisfies Record<string, Token>;

export const SUPPORTED_TOKENS: Token[] = Object.values(ARBITRUM_TOKENS);

export function getTokenByAddress(address: string): Token | undefined {
  const needle = address.toLowerCase();
  return SUPPORTED_TOKENS.find((t) => t.address.toLowerCase() === needle);
}

// Placeholder prices used to drive USD math while oracle reads aren't wired.
// Keyed by symbol because the mock data flows through symbol checks already.
const MOCK_PRICES_USD: Record<string, number> = {
  USDC: 1,
  WBTC: 70_000,
  ETH: 3_500,
};

export function getMockPriceUsd(token: Token): number {
  return MOCK_PRICES_USD[token.symbol] ?? 1;
}
