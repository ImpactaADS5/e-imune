import { Router } from "express";
import * as campaignController from "./campaign.controller";

const router = Router();
router.post("/", campaignController.create);
router.get("/", campaignController.list);
export default router;