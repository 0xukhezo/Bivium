import { Router, type Router as RouterType } from "express";
import healthRouter from "./health/health.route.js";
import lendersRouter from "./lenders/lenders.route.js";
import marketsRouter from "./markets/markets.route.js";

const router: RouterType = Router();

router.use("/health", healthRouter);
router.use("/markets", marketsRouter);
router.use("/lenders", lendersRouter);

export default router;
