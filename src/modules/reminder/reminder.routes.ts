import { Router } from "express";
import * as reminderController from "./reminder.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();
router.post("/", requireAuth, reminderController.create);
router.get("/", requireAuth, reminderController.list);
export default router;
