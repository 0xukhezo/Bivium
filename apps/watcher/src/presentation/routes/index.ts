import { Router, type Router as RouterType } from "express";
import systemRouter from "../system/system.route.js";
import webhooksRouter from "./webhooks.route.js";

const router: RouterType = Router();

router.use("/webhooks", webhooksRouter);
router.use("/system", systemRouter);

export default router;
