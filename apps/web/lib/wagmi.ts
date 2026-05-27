import { http, createConfig } from "wagmi";
import { arbitrum, arbitrumSepolia, mainnet } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;

const arbitrumRpc = alchemyKey
  ? `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : undefined;
const arbitrumSepoliaRpc = alchemyKey
  ? `https://arb-sepolia.g.alchemy.com/v2/${alchemyKey}`
  : undefined;
const mainnetRpc = alchemyKey
  ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : undefined;

const connectors = [
  injected({ shimDisconnect: true }),
  coinbaseWallet({ appName: "Bivium" }),
  ...(wcProjectId
    ? [
        walletConnect({
          projectId: wcProjectId,
          showQrModal: true,
          metadata: {
            name: "Bivium",
            description: "Be your own Aave. Single-lender venues on Arbitrum.",
            url: "https://bivium.xyz",
            icons: ["https://bivium.xyz/icon.png"],
          },
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  chains: [arbitrum, arbitrumSepolia, mainnet],
  connectors,
  transports: {
    [arbitrum.id]: http(arbitrumRpc),
    [arbitrumSepolia.id]: http(arbitrumSepoliaRpc),
    [mainnet.id]: http(mainnetRpc),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
