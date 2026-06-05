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

// EIP-7702 self-sponsored activation. See lib/privy-local-account.ts for the
// reason we hand-build the viem account instead of using Privy's
// `toViemAccount` (its bundled transaction serializer rejects type-4 in
// SDK 3.29 / @privy-io/ethereum 0.1.4).
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
const arbitrumRpc = alchemyKey
  ? `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : undefined;

export function useActivateProfile() {
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

    try {
      const account = createPrivyLocalAccount(embedded);
      const walletClient = createWalletClient({
        account,
        chain: arbitrum,
        transport: http(arbitrumRpc),
      });

      setStatus("signing");
      const authorization = await walletClient.signAuthorization({
        contractAddress: profileAddress,
        executor: "self",
      });

      setStatus("broadcasting");
      // BiviumProfile has no payable fallback / receive(), so an empty-data
      // self-call would revert during `eth_estimateGas` (which simulates with
      // the delegation already applied). `paused()` is a view function that
      // exists in the ABI — installs the delegation and exits cleanly.
      const txHash = await walletClient.sendTransaction({
        authorizationList: [authorization],
        to: account.address,
        data: encodeFunctionData({
          abi: BiviumProfileAbi,
          functionName: "paused",
        }),
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
  }, [wallets, profileAddress, publicClient]);

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
