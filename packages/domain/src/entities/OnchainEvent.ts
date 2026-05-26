import { OnchainEventProvider } from "./OnchainEventProvider.js";

export interface AlchemyWebhookPayload {
	webhookId: string;
	id: string;
	createdAt: string;
	type: string;
	event: {
		network: string;
		activity: Array<{
			fromAddress: string;
			toAddress: string;
			blockNum?: string;
			hash?: string;
			value?: number;
			asset?: string;
			category?: string;
			rawContract?: {
				rawValue?: string;
				address?: string;
				decimals?: number;
			};
		}>;
	};
}

export interface OnchainEventProps {
	id: string;
	provider: OnchainEventProvider;
	payload: unknown;
	processed: boolean;
	error: boolean;
	timesProcessed: number;
	lastProcessedAt: Date | null;
	createdAt: Date;
}

export class OnchainEvent implements OnchainEventProps {
	public id: string;
	public provider: OnchainEventProvider;
	public payload: unknown;
	public processed: boolean;
	public error: boolean;
	public timesProcessed: number;
	public lastProcessedAt: Date | null;
	public createdAt: Date;

	constructor(props: OnchainEventProps) {
		this.id = props.id;
		this.provider = props.provider;
		this.payload = props.payload;
		this.processed = props.processed;
		this.error = props.error;
		this.timesProcessed = props.timesProcessed;
		this.lastProcessedAt = props.lastProcessedAt;
		this.createdAt = props.createdAt;
	}

	static createFromAlchemyWebhook(
		payload: AlchemyWebhookPayload,
	): Omit<OnchainEventProps, "id"> {
		return {
			provider: OnchainEventProvider.ALCHEMY,
			payload,
			processed: false,
			error: false,
			timesProcessed: 0,
			lastProcessedAt: null,
			createdAt: new Date(payload.createdAt),
		};
	}

	/**
	 * Extracts every wallet address referenced in the Alchemy address-activity payload.
	 * Used by the application layer to publish `user.balance.refresh` events per affected wallet.
	 */
	static extractAffectedWallets(payload: AlchemyWebhookPayload): string[] {
		const addresses = new Set<string>();
		for (const activity of payload.event?.activity ?? []) {
			if (activity.fromAddress)
				addresses.add(activity.fromAddress.toLowerCase());
			if (activity.toAddress) addresses.add(activity.toAddress.toLowerCase());
		}
		return [...addresses];
	}
}
