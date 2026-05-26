export class ResourceNotFoundError extends Error {
	constructor(
		public readonly resource: string,
		public readonly identifier: string,
	) {
		super(`${resource} with identifier ${identifier} not found`);
		this.name = "ResourceNotFoundError";
	}
}
