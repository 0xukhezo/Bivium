import { Router, type Router as RouterType } from "express";
import { CONTROLLER_TYPES } from "../../container/controller/controllerTypes.js";
import { container } from "../../inversify.config.js";
import type { LenderMarketsController } from "./LenderMarketsController.js";

const router: RouterType = Router();
const controller = container.get<LenderMarketsController>(
	CONTROLLER_TYPES.LenderMarketsController,
);

router.get("/:address/markets", controller.listLenderMarkets);

export default router;
