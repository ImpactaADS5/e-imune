import { Router } from "express";
import * as vaccineRecordController from "./vaccine-record.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();
router.post("/", requireAuth, vaccineRecordController.create);
router.get("/", requireAuth, vaccineRecordController.list);
export default router;
