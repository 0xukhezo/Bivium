import { validateBodySignature } from "@bivium/common/middlewares";
import { Router, type Router as RouterType } from "express";
import { alchemyMiddlewareConfig } from "../../config/alchemy.config.js";
import { CONTROLLER_TYPES } from "../../container/controller/controllerTypes.js";
import { container } from "../../inversify.config.js";
import type { WebhooksController } from "../controllers/WebhooksController.js";

const router: RouterType = Router();
const controller = container.get<WebhooksController>(
	CONTROLLER_TYPES.WebhooksController,
);

router.post(
	"/alchemy",
	validateBodySignature(alchemyMiddlewareConfig),
	controller.handleAlchemyWebhook,
);

export default router;
