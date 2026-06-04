/**
 * Generates a random EVM wallet and prints its private key + public address.
 *
 * Used to spin up throw-away test accounts for mainnet smoke tests (e.g. the
 * EIP-7702 indexer dry-run). Print only — does not persist anything. Capture
 * the output into your shell history at your own risk.
 *
 * Usage: pnpm --filter @bivium/scripts generate-wallet
 */

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log("Private key:", privateKey);
console.log("Address    :", account.address);
