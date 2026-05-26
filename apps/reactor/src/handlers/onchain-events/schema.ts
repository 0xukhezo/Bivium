import { z } from "zod";

export const OnchainEventCreatedSchema = z.object({
	onchainEventId: z.string().uuid(),
});

export type OnchainEventCreatedPayload = z.infer<
	typeof OnchainEventCreatedSchema
>;
