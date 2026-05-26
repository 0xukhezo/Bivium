export interface UserProps {
	id: string;
	address: string;
	createdAt: Date;
	updatedAt: Date;
}

export class User implements UserProps {
	public id: string;
	public address: string;
	public createdAt: Date;
	public updatedAt: Date;

	constructor(props: UserProps) {
		this.id = props.id;
		this.address = props.address.toLowerCase();
		this.createdAt = props.createdAt;
		this.updatedAt = props.updatedAt;
	}
}
