import type { IndexerLenderRegistration } from "../entities/IndexerLenderRegistration.js";

/**
 * Read-only access to `indexer.lenders`. Owned by the indexer bounded
 * context, exposed here so the rest of the system can enumerate every known
 * lender registration without reaching across schemas in handlers.
 *
 * Returns the full set — callers diff this against the Alchemy webhook's
 * tracked-address list to decide what to enrol. For a hackathon-scale lender
 * count (≪ 10k) the full scan is cheap and removes the need for a cursor
 * table. Add pagination here if it ever stops being cheap.
 */
export interface IIndexerLenderReadRepository {
	listAll(): Promise<IndexerLenderRegistration[]>;
}
