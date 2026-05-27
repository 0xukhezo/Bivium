/**
 * Lowercases a hex address so primary-key lookups are case-insensitive.
 * Ponder normalizes addresses to lowercase before storing, but event args
 * sometimes arrive checksummed depending on the source — normalize defensively
 * at every handler boundary.
 */
export function lower(addr: string): `0x${string}` {
	return addr.toLowerCase() as `0x${string}`;
}
