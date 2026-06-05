import { arbitrum } from "wagmi/chains";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

// Next.js only inlines `process.env.X` when the access is static; call sites
// must pass `process.env.NEXT_PUBLIC_*` directly.
function validate(
  raw: string | undefined,
  name: string,
): `0x${string}` | undefined {
  if (!raw) return undefined;
  if (!ADDRESS_RE.test(raw)) {
    throw new Error(`Env var ${name} is not a valid 0x address: ${raw}`);
  }
  return raw.toLowerCase() as `0x${string}`;
}

export const CONTRACT_ADDRESSES = {
  bivium: validate(
    process.env.NEXT_PUBLIC_BIVIUM_ADDRESS,
    "NEXT_PUBLIC_BIVIUM_ADDRESS",
  ),
  router: validate(
    process.env.NEXT_PUBLIC_BIVIUM_ROUTER_ADDRESS,
    "NEXT_PUBLIC_BIVIUM_ROUTER_ADDRESS",
  ),
  eventEmitter: validate(
    process.env.NEXT_PUBLIC_BIVIUM_EVENT_EMITTER_ADDRESS,
    "NEXT_PUBLIC_BIVIUM_EVENT_EMITTER_ADDRESS",
  ),
  profile: validate(
    process.env.NEXT_PUBLIC_BIVIUM_PROFILE_ADDRESS,
    "NEXT_PUBLIC_BIVIUM_PROFILE_ADDRESS",
  ),
  oracleFactory: validate(
    process.env.NEXT_PUBLIC_BIVIUM_ORACLE_FACTORY_ADDRESS,
    "NEXT_PUBLIC_BIVIUM_ORACLE_FACTORY_ADDRESS",
  ),
} as const;

export const CONTRACTS_CHAIN_ID = arbitrum.id;

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
