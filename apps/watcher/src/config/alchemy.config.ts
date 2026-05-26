import type { BodySignatureMiddlewareConfig } from "@bivium/common/middlewares";
import environment from "../env/watcher-environment.js";

/**
 * Alchemy uses a per-webhook signing key. Bivium is single-chain (Arbitrum) and
 * runs a single webhook so the key is loaded statically from env.
 */
export const alchemyMiddlewareConfig: BodySignatureMiddlewareConfig = {
	headerName: "x-alchemy-signature",
	getSigningKey: async () => environment.alchemySigningKey,
	errorMessage: "Unauthorized: invalid Alchemy signature",
};
