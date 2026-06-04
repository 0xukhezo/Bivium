export interface UserCurrentBalanceProps {
	address: string;
	assetId: string;
	chainId: number;
	balance: string;
	lastUpdated: Date;
}

/**
 * Current balance of a wallet for a curated asset. Address-keyed because
 * Bivium is non-custodial — there's no separate `User` record; the EOA is
 * the identity.
 *
 * `address` is lowercased in the constructor so callers can compare safely
 * against indexer rows / Alchemy responses (both arrive in mixed case).
 */
export class UserCurrentBalance implements UserCurrentBalanceProps {
	public address: string;
	public assetId: string;
	public chainId: number;
	/** Decimal string (base units) — preserves precision beyond JS Number. */
	public balance: string;
	public lastUpdated: Date;

	constructor(props: UserCurrentBalanceProps) {
		this.address = props.address.toLowerCase();
		this.assetId = props.assetId;
		this.chainId = props.chainId;
		this.balance = props.balance;
		this.lastUpdated = props.lastUpdated;
	}
}
