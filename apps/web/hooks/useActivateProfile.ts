"use client";

import { useCallback, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  type ResolvedRegister,
} from "wagmi";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

type ConfiguredChainId = ResolvedRegister["config"]["chains"][number]["id"];

const CHAIN_ID = 42161 satisfies ConfiguredChainId; // Arbitrum One

/**
 * Performs the one-shot EIP-7702 delegation that turns the connected EOA into
 * a BiviumProfile instance.
 *
 * Flow:
 *   1. `walletClient.signAuthorization({ ..., executor: "self" })` — the EOA
 *      signs an authorization for our Profile template. `executor: "self"`
 *      tells viem the same EOA will send the tx, so it bumps the auth nonce
 *      by 1 (the tx itself consumes the current nonce).
 *   2. `walletClient.sendTransaction({ to: self, data: "0x", authorizationList })`
 *      — broadcasts a type-0x04 set-code tx. The auth installs the delegation
 *      on the EOA; the call to `self` is a no-op that runs the just-installed
 *      Profile code (no initializer to call — Profile's setters auto-register
 *      via `_ensureRegistered()` on first use).
 *   3. `useWaitForTransactionReceipt` confirms.
 *
 * Wallets that don't yet support EIP-7702 throw on step 1 — surfaced via the
 * returned `notSupported` flag so the UI can show a fallback.
 */
export function useActivateProfile() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const profileAddress = CONTRACT_ADDRESSES.profile;

  const [hash, setHash] = useState<`0x${string}` | undefined>(undefined);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [notSupported, setNotSupported] = useState(false);

  const reset = useCallback(() => {
    setHash(undefined);
    setIsPending(false);
    setIsConfirming(false);
    setIsSuccess(false);
    setError(null);
    setNotSupported(false);
  }, []);

  const activate = useCallback(async () => {
    reset();
    if (!walletClient) {
      setError(new Error("Wallet client not ready"));
      return;
    }
    if (!address) {
      setError(new Error("Wallet not connected"));
      return;
    }
    if (!profileAddress) {
      setError(
        new Error(
          "BiviumProfile address not configured — set NEXT_PUBLIC_BIVIUM_PROFILE_ADDRESS",
        ),
      );
      return;
    }
    if (!publicClient) {
      setError(new Error("RPC client not ready"));
      return;
    }

    setIsPending(true);
    try {
      const authorization = await walletClient.signAuthorization({
        account: address,
        contractAddress: profileAddress,
        chainId: CHAIN_ID,
        executor: "self",
      });

      const txHash = await walletClient.sendTransaction({
        account: address,
        to: address,
        data: "0x",
        authorizationList: [authorization],
        chain: walletClient.chain,
      });
      setHash(txHash);
      setIsPending(false);
      setIsConfirming(true);

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      setIsConfirming(false);
      if (receipt.status === "success") {
        setIsSuccess(true);
      } else {
        setError(new Error("Activation transaction reverted"));
      }
    } catch (err) {
      setIsPending(false);
      setIsConfirming(false);
      const e = err instanceof Error ? err : new Error(String(err));
      // viem throws specific errors when the connector / wallet doesn't
      // support type-4 (set-code) txs. We sniff on name + message.
      const msg = e.message.toLowerCase();
      if (
        e.name === "MethodNotSupportedRpcError" ||
        e.name === "UnsupportedTransactionTypeError" ||
        msg.includes("does not support") ||
        msg.includes("authorization") && msg.includes("not supported")
      ) {
        setNotSupported(true);
      }
      setError(e);
    }
  }, [walletClient, publicClient, address, profileAddress, reset]);

  return {
    activate,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    notSupported,
    reset,
  };
}
