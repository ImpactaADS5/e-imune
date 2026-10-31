import { NextFunction, Request, RequestHandler, Response, Router } from "express";
import { createClinicController } from "../controllers/clinic.controller";
import { requireAuth } from "../middlewares/auth";
import type { ClinicRepo } from "../repositories/clinic.repository";

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

export function createClinicRouter(repo: ClinicRepo, auth: RequestHandler = requireAuth) {
  const router = Router();
  const c = createClinicController(repo);

  router.use(auth);
  router.get("/nearby", wrap(c.nearby));

  return router;
}
