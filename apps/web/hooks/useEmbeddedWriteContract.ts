"use client";

import { useCallback, useState } from "react";
import {
  getEmbeddedConnectedWallet,
  useWallets,
} from "@privy-io/react-auth";
import {
  createWalletClient,
  custom,
  encodeFunctionData,
  type Abi,
  type EIP1193Provider,
} from "viem";
import { arbitrum } from "viem/chains";
import { usePublicClient, useWaitForTransactionReceipt } from "wagmi";

interface WriteParams<TAbi extends Abi> {
  address: `0x${string}`;
  abi: TAbi;
  functionName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: readonly any[];
}

export function useEmbeddedWriteContract() {
  const { wallets } = useWallets();
  const publicClient = usePublicClient();

  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const receipt = useWaitForTransactionReceipt({
    hash,
    chainId: arbitrum.id,
  });

  const writeContract = useCallback(
    async <TAbi extends Abi>(params: WriteParams<TAbi>) => {
      setError(null);
      setHash(undefined);
      const embedded = getEmbeddedConnectedWallet(wallets);
      if (!embedded) {
        const e = new Error(
          "Privy embedded wallet not ready. Sign out and back in.",
        );
        setError(e);
        throw e;
      }
      if (!publicClient) {
        const e = new Error("RPC client not ready");
        setError(e);
        throw e;
      }

      setIsPending(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = encodeFunctionData({
          abi: params.abi,
          functionName: params.functionName,
          args: params.args,
        } as any);

        const provider =
          (await embedded.getEthereumProvider()) as EIP1193Provider;
        const walletClient = createWalletClient({
          account: embedded.address as `0x${string}`,
          chain: arbitrum,
          transport: custom(provider),
        });

        // Estimate gas against the public Arbitrum RPC (not via the Privy
        // provider) and add a 50% buffer. Privy's `eth_estimateGas` has
        // surfaced as the source of "intrinsic gas too low" pre-flight
        // rejections — they fall back to a too-small default when their
        // own estimate is missing or zero. Estimating ourselves and
        // pinning the `gas` field bypasses that path.
        const gasEstimate = await publicClient.estimateGas({
          account: embedded.address as `0x${string}`,
          to: params.address,
          data,
        });
        const gas = (gasEstimate * 3n) / 2n;

        const txHash = await walletClient.sendTransaction({
          to: params.address,
          data,
          gas,
        });
        setHash(txHash);
        setIsPending(false);
        return txHash;
      } catch (err) {
        setIsPending(false);
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      }
    },
    [wallets, publicClient],
  );

  const reset = useCallback(() => {
    setHash(undefined);
    setIsPending(false);
    setError(null);
  }, []);

  return {
    writeContract,
    hash,
    isPending,
    isConfirming: receipt.isLoading,
    isSuccess: receipt.isSuccess,
    error: error ?? receipt.error,
    reset,
  };
}
