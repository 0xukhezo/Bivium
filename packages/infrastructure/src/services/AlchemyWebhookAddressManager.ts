import type { IAlchemyWebhookAddressManagerPort } from "@bivium/application";
import { COMMON_TYPES } from "@bivium/common";
import type { ILogger } from "@bivium/common/logger";
import { inject, injectable } from "inversify";
import { INFRASTRUCTURE_TYPES } from "../types.js";

export interface AlchemyNotifyConfig {
	/** Notify "auth token" from the Alchemy dashboard (NOT the chain API key). */
	authToken: string;
	/** Webhook id (`wh_…`) from the dashboard. */
	webhookId: string;
	/** Hard cap on addresses per API call. Alchemy's documented limit is 100. */
	batchSize?: number;
	/** Base URL — overridable for tests. */
	baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://dashboard.alchemy.com";
const DEFAULT_BATCH_SIZE = 100;
const LIST_PAGE_LIMIT = 100;

interface ListAddressesPage {
	data?: string[];
	pagination?: { cursor?: string };
}

/**
 * Talks to the Alchemy Notify REST API:
 *   - `GET  /api/webhook-addresses?webhook_id=…` to enumerate tracked addresses
 *   - `PATCH /api/update-webhook-addresses` to add new ones
 *
 * Implemented with plain `fetch` rather than `alchemy-sdk`'s `notify`
 * namespace because both endpoints require the Notify auth token (not the
 * chain API key) and we never need the rest of that namespace — wrapping
 * the SDK for two calls is more dependency than it's worth.
 *
 * Idempotency: `PATCH update-webhook-addresses` is a no-op on
 * already-tracked addresses, so the diff job can re-send safely if it ever
 * races with itself. The caller (sync handler) still pre-diffs to keep API
 * usage low.
 */
@injectable()
export class AlchemyWebhookAddressManager
	implements IAlchemyWebhookAddressManagerPort
{
	private readonly config: AlchemyNotifyConfig;
	private readonly logger: ILogger;

	constructor(
		@inject(INFRASTRUCTURE_TYPES.AlchemyNotifyConfig)
		config: AlchemyNotifyConfig,
		@inject(COMMON_TYPES.Logger)
		logger: ILogger,
	) {
		this.config = config;
		this.logger = logger;
	}

	async listAddresses(): Promise<string[]> {
		const baseUrl = this.config.baseUrl ?? DEFAULT_BASE_URL;
		const collected: string[] = [];
		let cursor: string | undefined;
		// Cap the loop defensively in case Alchemy paginates without ever
		// returning an empty cursor — we'd otherwise loop forever on a regression.
		for (let page = 0; page < 1000; page++) {
			const params = new URLSearchParams({
				webhook_id: this.config.webhookId,
				limit: String(LIST_PAGE_LIMIT),
			});
			if (cursor) params.set("after", cursor);
			const url = `${baseUrl}/api/webhook-addresses?${params.toString()}`;
			const response = await fetch(url, {
				method: "GET",
				headers: {
					"X-Alchemy-Token": this.config.authToken,
				},
			});
			if (!response.ok) {
				const text = await response.text().catch(() => "<unreadable body>");
				throw new Error(
					`Alchemy webhook-addresses GET failed: ${response.status} ${response.statusText} — ${text}`,
				);
			}
			const body = (await response.json()) as ListAddressesPage;
			const batch = body.data ?? [];
			for (const addr of batch) collected.push(addr.toLowerCase());
			cursor = body.pagination?.cursor;
			if (!cursor || batch.length === 0) break;
		}
		return collected;
	}

	async addAddresses(addresses: string[]): Promise<number> {
		if (addresses.length === 0) return 0;
		const deduped = [...new Set(addresses.map((a) => a.toLowerCase()))];
		const batchSize = this.config.batchSize ?? DEFAULT_BATCH_SIZE;
		const baseUrl = this.config.baseUrl ?? DEFAULT_BASE_URL;
		const url = `${baseUrl}/api/update-webhook-addresses`;

		let submitted = 0;
		for (let i = 0; i < deduped.length; i += batchSize) {
			const batch = deduped.slice(i, i + batchSize);
			const response = await fetch(url, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					"X-Alchemy-Token": this.config.authToken,
				},
				body: JSON.stringify({
					webhook_id: this.config.webhookId,
					addresses_to_add: batch,
					addresses_to_remove: [],
				}),
			});
			if (!response.ok) {
				const text = await response.text().catch(() => "<unreadable body>");
				throw new Error(
					`Alchemy update-webhook-addresses failed: ${response.status} ${response.statusText} — ${text}`,
				);
			}
			submitted += batch.length;
			this.logger.info("Alchemy webhook addresses updated", {
				webhookId: this.config.webhookId,
				addedCount: batch.length,
			});
		}
		return submitted;
	}
}
