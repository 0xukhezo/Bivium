import { Router, type Router as RouterType } from "express";
import { CONTROLLER_TYPES } from "../../container/controller/controllerTypes.js";
import { container } from "../../inversify.config.js";
import type { MarketsController } from "./MarketsController.js";

const router: RouterType = Router();
const controller = container.get<MarketsController>(
	CONTROLLER_TYPES.MarketsController,
);

router.get("/", controller.listMarkets);

export default router;
