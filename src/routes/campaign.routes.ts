import { NextFunction, Request, RequestHandler, Response, Router } from "express";
import { createCampaignController } from "../controllers/campaign.controller";
import { requireAuth } from "../middlewares/auth";
import type { CampaignRepo } from "../repositories/campaign.repository";

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

export function createCampaignRouter(repo: CampaignRepo, auth: RequestHandler = requireAuth, today?: () => string) {
  const router = Router();
  const c = createCampaignController(repo, today);

  router.use(auth);
  router.get("/featured", wrap(c.featured));

  return router;
}
