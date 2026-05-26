export interface IApiError extends Error {
	statusCode: number;
	rawErrors?: string[];
}

export class ApiError extends Error implements IApiError {
	statusCode: number;
	rawErrors?: string[];

	constructor(statusCode: number, message: string, rawErrors?: string[]) {
		super(message);
		this.statusCode = statusCode;
		if (rawErrors) {
			this.rawErrors = rawErrors;
		}
		Error.captureStackTrace(this, this.constructor);
	}
}

export class HttpBadRequestError extends ApiError {
	constructor(message: string, errors?: string[]) {
		super(400, message, errors);
	}
}

export class HttpUnAuthorizedError extends ApiError {
	constructor(message: string) {
		super(401, message);
	}
}

export class HttpNotFoundError extends ApiError {
	constructor(message: string, errors?: string[]) {
		super(404, message, errors);
	}
}

export class HttpInternalServerError extends ApiError {
	constructor(message: string, errors?: string[]) {
		super(500, message, errors);
	}
}
