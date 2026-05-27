import { createConfig } from "ponder";

import { BiviumAbi } from "./abis/BiviumAbi.js";
import { BiviumEventEmitterAbi } from "./abis/BiviumEventEmitterAbi.js";
import { BiviumRouterAbi } from "./abis/BiviumRouterAbi.js";

function required(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing env var: ${name}`);
	return value;
}

function requiredAddress(name: string): `0x${string}` {
	const value = required(name).toLowerCase();
	if (!/^0x[0-9a-f]{40}$/.test(value)) {
		throw new Error(`Env var ${name} is not a valid 0x address: ${value}`);
	}
	return value as `0x${string}`;
}

const startBlock = Number(required("BIVIUM_START_BLOCK"));
if (!Number.isFinite(startBlock) || startBlock < 0) {
	throw new Error("BIVIUM_START_BLOCK must be a non-negative integer");
}

export default createConfig({
	chains: {
		arbitrum: {
			id: 42161,
			rpc: required("PONDER_RPC_URL_42161"),
		},
	},
	contracts: {
		Bivium: {
			abi: BiviumAbi,
			chain: "arbitrum",
			address: requiredAddress("BIVIUM_ADDRESS"),
			startBlock,
		},
		BiviumEventEmitter: {
			abi: BiviumEventEmitterAbi,
			chain: "arbitrum",
			address: requiredAddress("BIVIUM_EVENT_EMITTER_ADDRESS"),
			startBlock,
		},
		BiviumRouter: {
			abi: BiviumRouterAbi,
			chain: "arbitrum",
			address: requiredAddress("BIVIUM_ROUTER_ADDRESS"),
			startBlock,
		},
	},
	database: {
		kind: "postgres",
		connectionString: required("DATABASE_URL"),
	},
});
