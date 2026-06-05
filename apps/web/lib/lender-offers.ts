import { ARBITRUM_TOKENS, type Token } from "./tokens";

export interface LenderOffer {
  lender: `0x${string}`;
  displayName: string;
  loanToken: Token;
  /** TODO: 1e18 bigint per-second. Today: 0–1 annualized fraction. */
  ratePerSecond: number;
  indicativeSize: { amount: number; usd: number };
  acceptedCollaterals: Token[];
  paused: boolean;
}

const LENDERS = [
  { addr: `0xc0be000000000000000000000000000000000001`, name: "cobie.eth" },
  { addr: `0x1c6e000000000000000000000000000000000002`, name: "vitalik.eth" },
  { addr: `0x1e505000000000000000000000000000000000003`, name: "jesus.eth" },
  { addr: `0xa11ce000000000000000000000000000000000004`, name: "alice.eth" },
  { addr: `0xb0b0000000000000000000000000000000000005`, name: "bob.eth" },
  { addr: `0xdef1000000000000000000000000000000000006`, name: "defi-fund.eth" },
] as const;

const PRICES_USD: Record<string, number> = {
  USDC: 1,
  WBTC: 70_000,
  ETH: 3_500,
};

function buildOffers(): LenderOffer[] {
  const tokens = [
    ARBITRUM_TOKENS.USDC,
    ARBITRUM_TOKENS.ETH,
    ARBITRUM_TOKENS.WBTC,
  ];
  const tokenRateBias: Record<string, number> = {
    USDC: 0.045,
    ETH: 0.03,
    WBTC: 0.025,
  };
  const collateralProfiles: Token[][] = [
    [ARBITRUM_TOKENS.WBTC, ARBITRUM_TOKENS.ETH, ARBITRUM_TOKENS.USDC],
    [ARBITRUM_TOKENS.WBTC, ARBITRUM_TOKENS.ETH],
    [ARBITRUM_TOKENS.ETH, ARBITRUM_TOKENS.USDC],
    [ARBITRUM_TOKENS.WBTC],
    [ARBITRUM_TOKENS.ETH],
    [ARBITRUM_TOKENS.WBTC, ARBITRUM_TOKENS.USDC],
  ];

  const out: LenderOffer[] = [];
  LENDERS.forEach((l, i) => {
    const lenderSkew = (i % 5) * 0.004;
    const sizeBase = 50_000 + i * 35_000;
    tokens.forEach((loanToken) => {
      const ratePerSecond =
        (tokenRateBias[loanToken.symbol] ?? 0.04) + lenderSkew;
      const price = PRICES_USD[loanToken.symbol] ?? 1;
      out.push({
        lender: l.addr as `0x${string}`,
        displayName: l.name,
        loanToken,
        ratePerSecond,
        indicativeSize: {
          amount: sizeBase / price,
          usd: sizeBase,
        },
        acceptedCollaterals: collateralProfiles[i],
        paused: i === 4,
      });
    });
  });
  return out;
}

export const MOCK_LENDER_OFFERS: LenderOffer[] = buildOffers();

function sameAddress(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

export function offersForPair(
  loanToken: Token,
  collateralToken: Token,
): LenderOffer[] {
  return MOCK_LENDER_OFFERS.filter(
    (o) =>
      !o.paused &&
      sameAddress(o.loanToken.address, loanToken.address) &&
      o.acceptedCollaterals.some((c) =>
        sameAddress(c.address, collateralToken.address),
      ),
  ).sort((a, b) => a.ratePerSecond - b.ratePerSecond);
}

export interface Fill {
  offer: LenderOffer;
  amount: number;
}

export interface WalkResult {
  fills: Fill[];
  totalFilled: number;
  weightedAvgRate: number;
  bestRate: number;
}

export function walkOrderbook(
  offers: LenderOffer[],
  requested: number,
): WalkResult {
  let remaining = requested;
  let rateXSize = 0;
  const fills: Fill[] = [];
  for (const offer of offers) {
    if (remaining <= 1e-12) break;
    const take = Math.min(remaining, offer.indicativeSize.amount);
    if (take > 1e-12) {
      fills.push({ offer, amount: take });
      rateXSize += offer.ratePerSecond * take;
      remaining -= take;
    }
  }
  const totalFilled = Math.max(0, requested - remaining);
  const weightedAvgRate = totalFilled > 0 ? rateXSize / totalFilled : 0;
  const bestRate = offers.length > 0 ? offers[0].ratePerSecond : 0;
  return { fills, totalFilled, weightedAvgRate, bestRate };
}
