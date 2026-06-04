import { Router, type Router as RouterType } from "express";
import borrowersRouter from "./borrowers/borrowers.route.js";
import healthRouter from "./health/health.route.js";
import lendersRouter from "./lenders/lenders.route.js";
import marketsRouter from "./markets/markets.route.js";

const router: RouterType = Router();

router.use("/health", healthRouter);
router.use("/markets", marketsRouter);
router.use("/lenders", lendersRouter);
router.use("/borrowers", borrowersRouter);

export default router;
