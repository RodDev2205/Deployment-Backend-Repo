// routes/activityRoutes.js
import { Router } from "express";
import { getActivityLogs } from "../controllers/activityController.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = Router();

router.get("/", verifyToken, getActivityLogs); // protected route

export default router;
