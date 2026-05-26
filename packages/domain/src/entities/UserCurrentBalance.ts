export interface UserCurrentBalanceProps {
	userId: string;
	assetId: string;
	chainId: number;
	balance: string;
	lastUpdated: Date;
}

export class UserCurrentBalance implements UserCurrentBalanceProps {
	public userId: string;
	public assetId: string;
	public chainId: number;
	/** Decimal string (base units) — preserves precision beyond JS Number. */
	public balance: string;
	public lastUpdated: Date;

	constructor(props: UserCurrentBalanceProps) {
		this.userId = props.userId;
		this.assetId = props.assetId;
		this.chainId = props.chainId;
		this.balance = props.balance;
		this.lastUpdated = props.lastUpdated;
	}
}
