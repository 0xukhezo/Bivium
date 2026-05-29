import { arbitrum } from "wagmi/chains";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function readAddress(name: string): `0x${string}` | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  if (!ADDRESS_RE.test(raw)) {
    // Fail loudly in dev: an env var that's set but malformed is almost
    // certainly a copy-paste mistake.
    throw new Error(`Env var ${name} is not a valid 0x address: ${raw}`);
  }
  return raw.toLowerCase() as `0x${string}`;
}

/**
 * Deployed contract addresses on Arbitrum mainnet, sourced from env so the
 * same build can target different deploys. `undefined` when the env var is
 * not set — the wagmi hooks must guard with `query: { enabled: ... }` before
 * issuing any read/write.
 */
export const CONTRACT_ADDRESSES = {
  bivium: readAddress("NEXT_PUBLIC_BIVIUM_ADDRESS"),
  router: readAddress("NEXT_PUBLIC_BIVIUM_ROUTER_ADDRESS"),
  eventEmitter: readAddress("NEXT_PUBLIC_BIVIUM_EVENT_EMITTER_ADDRESS"),
} as const;

export const CONTRACTS_CHAIN_ID = arbitrum.id;

/** Throws a friendly error if the address is missing — use at write sites. */
export function requireAddress(
  name: keyof typeof CONTRACT_ADDRESSES,
): `0x${string}` {
  const addr = CONTRACT_ADDRESSES[name];
  if (!addr) {
    throw new Error(
      `Contract address for "${name}" is not configured. Set the matching NEXT_PUBLIC_BIVIUM_*_ADDRESS env var in apps/web/.env.local and restart the dev server.`,
    );
  }
  return addr;
}
