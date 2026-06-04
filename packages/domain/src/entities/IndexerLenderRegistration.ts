/**
 * Lightweight projection of `indexer.lenders` — just the fields the
 * webhook-sync job needs. Not the full lender state (no paused, no
 * last_updated_block) because the job only cares about "is this a new
 * lender we haven't told Alchemy about?".
 *
 * Address is normalised to lowercase in the constructor so callers can
 * compare safely against indexer rows (which are stored lowercased by
 * Ponder handlers).
 */
export interface IndexerLenderRegistrationProps {
	address: string;
	firstSeenBlock: bigint;
}

export class IndexerLenderRegistration
	implements IndexerLenderRegistrationProps
{
	public readonly address: string;
	public readonly firstSeenBlock: bigint;

	constructor(props: IndexerLenderRegistrationProps) {
		this.address = props.address.toLowerCase();
		this.firstSeenBlock = props.firstSeenBlock;
	}
}
