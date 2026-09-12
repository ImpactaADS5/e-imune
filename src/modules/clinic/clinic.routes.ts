import { Router } from "express";
import * as clinicController from "./clinic.controller";

const router = Router();

router.post("/", clinicController.create);
router.get("/", clinicController.list);

export default router;