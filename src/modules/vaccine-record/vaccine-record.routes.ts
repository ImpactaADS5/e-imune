import { Router } from "express";
import * as vaccineRecordController from "./vaccine-record.controller";

const router = Router();

// Rotas da AC1
router.post("/", vaccineRecordController.create);
router.get("/", vaccineRecordController.list);

// Novas rotas da AC2
router.put("/:id", vaccineRecordController.update);
router.get("/progress/:userId", vaccineRecordController.progress);
router.get("/next-doses/:userId", vaccineRecordController.nextDoses);

export default router;
