import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import employerRouter from "./employer";
import employeeRouter from "./employee";
import assistantRouter from "./assistant";
import consultantRouter from "./consultant";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(employerRouter);
router.use(employeeRouter);
router.use(assistantRouter);
router.use(consultantRouter);
router.use(adminRouter);

export default router;
