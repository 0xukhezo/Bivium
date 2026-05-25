import { BrowserProvider, JsonRpcSigner } from "ethers";
import type { Config } from "wagmi";
import { getConnectorClient } from "wagmi/actions";
import type { Account, Chain, Client, Transport } from "viem";

function clientToProvider(client: Client<Transport, Chain>) {
  const { chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  return new BrowserProvider(transport, network);
}

function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport, network);
  return new JsonRpcSigner(provider, account.address);
}

export async function getEthersProvider(config: Config, chainId?: number) {
  const client = await getConnectorClient(config, { chainId });
  return clientToProvider(client);
}

export async function getEthersSigner(config: Config, chainId?: number) {
  const client = await getConnectorClient(config, { chainId });
  return clientToSigner(client);
}
