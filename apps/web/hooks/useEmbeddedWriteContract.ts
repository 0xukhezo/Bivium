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
        // Use `simulateContract` instead of raw `estimateGas` so reverts
        // come back with the decoded reason (custom errors via the ABI,
        // and `require` messages). `simulateContract` also returns a
        // ready-to-send `request` with the gas already filled, which
        // dodges Privy's flaky `eth_estimateGas` (the source of past
        // "intrinsic gas too low" rejections). We then add a 50% buffer
        // to the simulated gas and send via the embedded wallet.
        const sim = await publicClient.simulateContract({
          account: embedded.address as `0x${string}`,
          address: params.address,
          abi: params.abi,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          functionName: params.functionName as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: params.args as any,
        });

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

        // `sim.request.gas` is viem's estimate from the simulation; bump
        // it 50% for safety. Falls back to a fresh `estimateGas` call if
        // viem didn't surface a gas estimate.
        const estimated =
          sim.request.gas ??
          (await publicClient.estimateGas({
            account: embedded.address as `0x${string}`,
            to: params.address,
            data,
          }));
        const gas = (estimated * 3n) / 2n;

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
