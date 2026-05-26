import { Router, type Router as RouterType } from "express";
import { CONTROLLER_TYPES } from "../../container/controller/controllerTypes.js";
import { container } from "../../inversify.config.js";
import type { SystemController } from "./SystemController.js";

const router: RouterType = Router();
const controller = container.get<SystemController>(
	CONTROLLER_TYPES.SystemController,
);

router.get("/health", controller.health);

export default router;
