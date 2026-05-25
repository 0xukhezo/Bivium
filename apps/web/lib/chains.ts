import { arbitrum, arbitrumSepolia } from "wagmi/chains";

export const supportedChains = [arbitrum, arbitrumSepolia] as const;
export const defaultChain = arbitrum;

export { arbitrum, arbitrumSepolia };
