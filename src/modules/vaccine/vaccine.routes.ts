import { Router } from "express";
import * as vaccineController from "./vaccine.controller";
import { requireAuth, requireRole } from "../../middleware/auth";

const router = Router();

// Define os endpoints da vacina
router.post("/", requireAuth, requireRole("ADMIN"), vaccineController.create);
router.get("/", requireAuth, vaccineController.list);
router.delete("/:id", requireAuth, requireRole("ADMIN"), vaccineController.remove);

export default router;
