import { NextFunction, Request, RequestHandler, Response, Router } from "express";
import { createVaccineRecordController } from "../controllers/vaccine-record.controller";
import { requireAuth } from "../middlewares/auth";
import type { VaccineRecordRepo } from "../repositories/vaccine-record.repository";

// Repassa erros de handlers async para o middleware de erro do Express
const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

/**
 * IMPORTANTE: monte este router ANTES de qualquer router que tenha GET /:id,
 * senão "summary" e "next-doses" seriam tratados como se fossem um id.
 */
export function createVaccineRecordRouter(
  repo: VaccineRecordRepo,
  auth: RequestHandler = requireAuth
) {
  const router = Router();
  const c = createVaccineRecordController(repo);

  router.use(auth);
  router.get("/summary", wrap(c.summary));
  router.get("/next-doses", wrap(c.nextDoses));
  router.get("/:id", wrap(c.getById));
  router.put("/:id", wrap(c.update));

  return router;
}
