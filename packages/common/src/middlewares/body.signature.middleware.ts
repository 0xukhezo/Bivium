import * as crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { HttpBadRequestError, HttpUnAuthorizedError } from "../api/errors.js";
import type { BodySignatureMiddlewareConfig } from "./types.js";

/**
 * Generic Express middleware that validates an HMAC-SHA256 body signature.
 * Relies on `req.rawBody` being populated by `express.json({ verify })`.
 */
export const validateBodySignature =
	({
		headerName,
		getSigningKey,
		errorMessage,
	}: BodySignatureMiddlewareConfig) =>
	async (req: Request, _res: Response, next: NextFunction) => {
		const signature = req.headers[headerName] as string | undefined;
		const rawBody = (req as Request & { rawBody?: string }).rawBody;

		if (!signature) {
			return next(new HttpUnAuthorizedError("Signature header is required."));
		}

		if (!rawBody) {
			return next(
				new HttpUnAuthorizedError(
					"Could not retrieve the raw body of the request.",
				),
			);
		}

		const signingKey = await getSigningKey(req);
		if (!signingKey) {
			return next(new HttpBadRequestError("Unsupported"));
		}

		if (!isValidSignatureForStringBody(rawBody, signature, signingKey)) {
			return next(
				new HttpUnAuthorizedError(
					errorMessage ?? "Unauthorized, signature validation failed.",
				),
			);
		}

		next();
	};

export function isValidSignatureForStringBody(
	body: string,
	signature: string,
	signingKey: string,
): boolean {
	const hmac = crypto.createHmac("sha256", signingKey);
	hmac.update(body, "utf8");
	const digest = hmac.digest("hex");
	const a = Buffer.from(signature, "utf8");
	const b = Buffer.from(digest, "utf8");
	// timingSafeEqual throws on length mismatch — bail early.
	if (a.length !== b.length) return false;
	return crypto.timingSafeEqual(a, b);
}
