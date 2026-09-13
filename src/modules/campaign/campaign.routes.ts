import { Router } from "express";
import * as campaignController from "./campaign.controller";
import { requireAuth, requireRole } from "../../middleware/auth";

const router = Router();
router.post("/", requireAuth, requireRole("ADMIN"), campaignController.create);
router.get("/", requireAuth, campaignController.list);
export default router;
