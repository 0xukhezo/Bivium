import { z } from "zod";

export const UserBalanceRefreshSchema = z.object({
	address: z.string().min(2),
	chainId: z.number().int().positive(),
	attempt: z.number().int().nonnegative().optional(),
});

export type UserBalanceRefreshPayload = z.infer<
	typeof UserBalanceRefreshSchema
>;
