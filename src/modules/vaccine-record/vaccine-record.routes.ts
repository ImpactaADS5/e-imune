import { Router } from "express";
import * as vaccineRecordController from "./vaccine-record.controller";

const router = Router();
router.post("/", vaccineRecordController.create);
router.get("/", vaccineRecordController.list);
export default router;