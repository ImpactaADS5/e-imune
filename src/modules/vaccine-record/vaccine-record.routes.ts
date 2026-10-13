import { Router } from "express";
import * as vaccineRecordController from "./vaccine-record.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

// Rotas da AC1
router.post("/", requireAuth, vaccineRecordController.create);
router.get("/", requireAuth, vaccineRecordController.list);

// Resumo e próximas doses devem vir antes da rota genérica por ID.
router.get("/summary", requireAuth, vaccineRecordController.summary);
router.get("/next-doses", requireAuth, vaccineRecordController.nextDosesSummary);
router.get("/progress/:userId", requireAuth, vaccineRecordController.progress);
router.get("/next-doses/:userId", requireAuth, vaccineRecordController.nextDoses);
router.get("/:id", requireAuth, vaccineRecordController.getById);
router.put("/:id", requireAuth, vaccineRecordController.update);

export default router;
