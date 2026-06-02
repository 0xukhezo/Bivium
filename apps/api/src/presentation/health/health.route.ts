import { Router, type Router as RouterType } from "express";
import { CONTROLLER_TYPES } from "../../container/controller/controllerTypes.js";
import { container } from "../../inversify.config.js";
import type { HealthController } from "./HealthController.js";

const router: RouterType = Router();
const controller = container.get<HealthController>(
	CONTROLLER_TYPES.HealthController,
);

router.get("/", controller.health);

export default router;
