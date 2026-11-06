import { Router } from "express";
import * as reminderController from "./reminder.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

// /due vem antes de /:id, senão "due" seria tratado como um id.
router.get("/", requireAuth, reminderController.list);
router.get("/due", requireAuth, reminderController.due);
router.post("/", requireAuth, reminderController.create);
router.get("/:id", requireAuth, reminderController.getById);
router.put("/:id", requireAuth, reminderController.update);
router.post("/:id/ack", requireAuth, reminderController.ack);
router.delete("/:id", requireAuth, reminderController.remove);

export default router;
