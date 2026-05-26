import type { Request } from "express";

export interface BodySignatureMiddlewareConfig {
	headerName: string;
	getSigningKey: (req: Request) => Promise<string | undefined>;
	errorMessage?: string;
}
