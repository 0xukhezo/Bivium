import type { ConnectedWallet } from "@privy-io/react-auth";
import {
  type Hex,
  type LocalAccount,
  type TransactionSerializable,
  hashMessage,
  hashTypedData,
  keccak256,
  parseSignature,
  serializeTransaction,
} from "viem";
import { hashAuthorization } from "viem/utils";
import { toAccount } from "viem/accounts";

// Builds a viem LocalAccount for a Privy embedded wallet by routing every
// signature through Privy's `secp256k1_sign` RPC (which signs any 32-byte
// hash). This avoids Privy's `toViemAccount` shipped in @privy-io/ethereum
// 0.1.4, whose transaction serializer throws on type-4 (EIP-7702) — making
// the recommended path unusable for self-sponsored 7702 set-code txs in this
// SDK version.
//
// viem handles all serialization here (legacy / 1559 / 7702 RLP) and only
// asks the account to sign the resulting hash, so type-4 just works.
export function createPrivyLocalAccount(
  wallet: ConnectedWallet,
): LocalAccount {
  const address = wallet.address as Hex;

  const signHash = async (hash: Hex): Promise<Hex> => {
    const provider = await wallet.getEthereumProvider();
    const sig = await provider.request({
      method: "secp256k1_sign",
      params: [hash],
    } as unknown as { method: string; params: unknown[] });
    return sig as Hex;
  };

  return toAccount({
    address,
    async sign({ hash }) {
      return signHash(hash);
    },
    async signMessage({ message }) {
      return signHash(hashMessage(message));
    },
    async signTypedData(parameters) {
      return signHash(hashTypedData(parameters as Parameters<typeof hashTypedData>[0]));
    },
    async signTransaction(transaction, options) {
      const serializer = options?.serializer ?? serializeTransaction;
      const tx = transaction as TransactionSerializable;
      const unsigned = (await serializer(tx)) as Hex;
      const txHash = keccak256(unsigned);
      const sigHex = await signHash(txHash);
      const sig = parseSignature(sigHex);
      return (await serializer(tx, sig)) as Hex;
    },
    async signAuthorization(authorization) {
      const auth = authorization as {
        address?: Hex;
        contractAddress?: Hex;
        chainId: number;
        nonce: number;
      };
      const address7702 = auth.address ?? (auth.contractAddress as Hex);
      const authHash = hashAuthorization({
        address: address7702,
        chainId: auth.chainId,
        nonce: auth.nonce,
      });
      const sigHex = await signHash(authHash);
      const sig = parseSignature(sigHex);
      return {
        address: address7702,
        chainId: auth.chainId,
        nonce: auth.nonce,
        ...sig,
      };
    },
  });
}
