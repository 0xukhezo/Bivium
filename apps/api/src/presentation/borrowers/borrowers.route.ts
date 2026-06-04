import { Router, type Router as RouterType } from "express";
import { CONTROLLER_TYPES } from "../../container/controller/controllerTypes.js";
import { container } from "../../inversify.config.js";
import type { BorrowersController } from "./BorrowersController.js";

const router: RouterType = Router();
const controller = container.get<BorrowersController>(
	CONTROLLER_TYPES.BorrowersController,
);

router.get("/:address/loans", controller.listBorrowerLoans);

export default router;
