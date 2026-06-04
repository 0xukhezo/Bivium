export type SyncLenderWebhookAddressesCommandInputDto = Record<string, never>;

export interface SyncLenderWebhookAddressesCommandOutputDto {
	/** Lenders found in the indexer. */
	indexerCount: number;
	/** Addresses already enrolled in the Alchemy webhook. */
	webhookCount: number;
	/** Addresses missing from the webhook that we just submitted. */
	addedCount: number;
}
