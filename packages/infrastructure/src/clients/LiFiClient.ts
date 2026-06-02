import { ServiceError } from "@bivium/common";

export interface LiFiClientOptions {
	apiUrl: string;
	apiKey?: string;
	timeoutMs?: number;
}

export interface LiFiTokenDto {
	chainId: number;
	address: string;
	symbol: string;
	decimals: number;
	name: string;
	logoURI?: string;
	priceUSD: string;
}

interface LiFiTokensResponse {
	tokens: Record<string, LiFiTokenDto[]>;
}

/**
 * Minimal LiFi REST client — just the `/tokens` endpoint, which returns full
 * token metadata and `priceUSD` in a single call. The richer LiFi surface
 * (quotes, routes, transactions) is intentionally out of scope here.
 */
export class LiFiClient {
	private readonly apiUrl: string;
	private readonly apiKey?: string;
	private readonly timeoutMs: number;

	constructor(options: LiFiClientOptions) {
		this.apiUrl = options.apiUrl.replace(/\/$/, "");
		this.apiKey = options.apiKey;
		this.timeoutMs = options.timeoutMs ?? 10_000;
	}

	async getTokens(params: {
		chainIds: number[];
	}): Promise<Record<string, LiFiTokenDto[]>> {
		if (params.chainIds.length === 0) return {};

		const search = new URLSearchParams();
		search.set("chains", params.chainIds.join(","));
		search.set("chainTypes", "EVM");
		const url = `${this.apiUrl}/tokens?${search.toString()}`;

		const headers: Record<string, string> = { accept: "application/json" };
		if (this.apiKey) headers["x-lifi-api-key"] = this.apiKey;

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.timeoutMs);
		try {
			const res = await fetch(url, { headers, signal: controller.signal });
			if (!res.ok) {
				throw new ServiceError(
					`LiFi /tokens returned ${res.status} ${res.statusText}`,
				);
			}
			const body = (await res.json()) as LiFiTokensResponse;
			return body.tokens ?? {};
		} catch (err) {
			if (err instanceof ServiceError) throw err;
			const message = err instanceof Error ? err.message : String(err);
			throw new ServiceError(`LiFi /tokens fetch failed: ${message}`);
		} finally {
			clearTimeout(timer);
		}
	}
}
