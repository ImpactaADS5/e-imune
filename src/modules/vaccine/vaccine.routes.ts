import { Router } from "express";
import * as vaccineController from "./vaccine.controller";

const router = Router();

// Define os endpoints da vacina
router.post("/", vaccineController.create);
router.get("/", vaccineController.list);

export default router;