import { Router } from "express";
import * as reminderController from "./reminder.controller";

const router = Router();
router.post("/", reminderController.create);
router.get("/", reminderController.list);
export default router;