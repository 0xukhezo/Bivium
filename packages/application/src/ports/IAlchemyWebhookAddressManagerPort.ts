/**
 * Port for managing the address list of an Alchemy "Address Activity"
 * webhook. The webhook itself stays static — created once via the Alchemy
 * dashboard. This port only reads / mutates which EOAs the webhook listens
 * to.
 *
 * All addresses (read and written) are lowercased. Alchemy stores them
 * checksummed in the dashboard but the API normalises by lowercasing for
 * comparison, and the rest of the Bivium pipeline (indexer, `public.users`)
 * keeps addresses lowercased — so we settle on lowercase at the seam.
 */
export interface IAlchemyWebhookAddressManagerPort {
	/**
	 * Returns every address currently enrolled in the webhook, lowercased.
	 * Paginates internally — callers can treat this as one logical call.
	 */
	listAddresses(): Promise<string[]>;

	/**
	 * Adds `addresses` to the webhook. Idempotent per Alchemy contract:
	 * re-adding an existing address is a no-op (no error, no dup). Returns
	 * the number of addresses submitted (after dedup of the input).
	 */
	addAddresses(addresses: string[]): Promise<number>;
}
