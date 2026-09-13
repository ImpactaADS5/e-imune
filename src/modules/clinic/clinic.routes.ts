import { Router } from "express";
import * as clinicController from "./clinic.controller";
import { requireAuth, requireRole } from "../../middleware/auth";

const router = Router();

router.post("/", requireAuth, requireRole("ADMIN"), clinicController.create);
router.get("/", requireAuth, clinicController.list);

export default router;
