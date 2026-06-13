"use client";

import { useCallback, useState } from "react";
import { getEmbeddedConnectedWallet, useWallets } from "@privy-io/react-auth";
import { createWalletClient, encodeFunctionData, http, type Hex } from "viem";
import { arbitrum } from "viem/chains";
import { usePublicClient } from "wagmi";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { BiviumProfileAbi } from "@/lib/contracts/abis/BiviumProfileAbi";
import { createPrivyLocalAccount } from "@/lib/privy-local-account";

type Status =
  | "idle"
  | "signing"
  | "broadcasting"
  | "confirming"
  | "success"
  | "error";

// EIP-7702 set-code activation. See lib/privy-local-account.ts for the
// reason we hand-build the viem account instead of using Privy's
// `toViemAccount` (its bundled transaction serializer rejects type-4 in
// SDK 3.29 / @privy-io/ethereum 0.1.4).
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
const arbitrumRpc = alchemyKey
  ? `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : undefined;

const ZERO_ADDRESS = `0x${"0".repeat(40)}` as const;

interface UseActivateProfileOptions {
  /**
   * Authorisation target. Defaults to the configured BiviumProfile address
   * (= activate). Pass `0x000…0` to revoke the existing delegation.
   */
  targetAddress?: Hex;
  /**
   * Calldata for the inner self-call. Defaults to `paused()` — a no-op
   * view call on BiviumProfile that wakes the contract dispatcher (without
   * which the type-4 tx reverts during gas estimation because the profile
   * has no payable fallback). For revocation we send empty data: there's
   * no contract code at the EOA after revoke, so the call just succeeds as
   * a plain transfer-zero.
   */
  selfCallData?: Hex;
}

export function useActivateProfile(opts: UseActivateProfileOptions = {}) {
  const { wallets } = useWallets();
  const publicClient = usePublicClient({ chainId: arbitrum.id });
  const profileAddress = CONTRACT_ADDRESSES.profile;

  const [status, setStatus] = useState<Status>("idle");
  const [hash, setHash] = useState<Hex | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setHash(null);
    setError(null);
  }, []);

  const activate = useCallback(async () => {
    setError(null);
    setHash(null);

    if (!profileAddress) {
      setError(
        new Error("NEXT_PUBLIC_BIVIUM_PROFILE_ADDRESS is not configured"),
      );
      setStatus("error");
      return;
    }
    if (!publicClient) {
      setError(new Error("Arbitrum RPC client unavailable"));
      setStatus("error");
      return;
    }
    const embedded = getEmbeddedConnectedWallet(wallets);
    if (!embedded) {
      setError(new Error("Privy embedded wallet not ready"));
      setStatus("error");
      return;
    }

    const target = opts.targetAddress ?? profileAddress;
    const callData =
      opts.selfCallData ??
      encodeFunctionData({
        abi: BiviumProfileAbi,
        functionName: "paused",
      });
    const isRevoke = target.toLowerCase() === ZERO_ADDRESS.toLowerCase();

    try {
      const account = createPrivyLocalAccount(embedded);
      const walletClient = createWalletClient({
        account,
        chain: arbitrum,
        transport: http(arbitrumRpc),
      });

      setStatus("signing");
      const authorization = await walletClient.signAuthorization({
        contractAddress: target,
        executor: "self",
      });

      setStatus("broadcasting");
      const txHash = await walletClient.sendTransaction({
        authorizationList: [authorization],
        to: account.address,
        // Revoking: there's no profile code at the EOA post-revoke, so the
        // dispatcher trick isn't needed (and would revert). Send empty
        // calldata — a plain self-call.
        data: isRevoke ? "0x" : callData,
        // eth_estimateGas on most RPCs (including public Arbitrum) does not
        // account for the EIP-7702 authorization-list intrinsic cost
        // (21k base + 12.5k PER_AUTH + 25k PER_EMPTY_ACCOUNT ≈ 58.5k for one
        // auth). Pin a safe lower bound so the chain doesn't reject with
        // "intrinsic gas too low" after a stale estimate.
        gas: 120_000n,
      });
      setHash(txHash);

      setStatus("confirming");
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setStatus("success");
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      console.error("[activate] failed", e);
      setError(e);
      setStatus("error");
    }
  }, [
    wallets,
    profileAddress,
    publicClient,
    opts.targetAddress,
    opts.selfCallData,
  ]);

  const isPending =
    status === "signing" ||
    status === "broadcasting" ||
    status === "confirming";

  return {
    activate,
    status,
    hash,
    error,
    reset,
    isPending,
    isSuccess: status === "success",
  };
}

/**
 * Revoke the EIP-7702 delegation by signing an authorisation pointing at
 * `address(0)`. After confirmation, `getCode(eoa)` returns `0x` and the
 * EOA is back to behaving like a plain EOA.
 */
export function useDeactivateProfile() {
  return useActivateProfile({ targetAddress: ZERO_ADDRESS });
}
