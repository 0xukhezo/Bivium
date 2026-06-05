import { http } from "wagmi";
import { arbitrum } from "wagmi/chains";
import { createConfig } from "@privy-io/wagmi";

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;

const arbitrumRpc = alchemyKey
  ? `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : undefined;

export const wagmiConfig = createConfig({
  chains: [arbitrum],
  transports: {
    [arbitrum.id]: http(arbitrumRpc),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
