import { NextFunction, Request, RequestHandler, Response, Router } from "express";
import { createReminderController } from "../controllers/reminder.controller";
import { requireAuth } from "../middlewares/auth";
import type { ReminderRepo } from "../repositories/reminder.repository";

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

/** /due vem ANTES de /:id, senão "due" seria tratado como um id. */
export function createReminderRouter(
  repo: ReminderRepo,
  auth: RequestHandler = requireAuth,
  now?: () => Date
) {
  const router = Router();
  const c = createReminderController(repo, now);

  router.use(auth);
  router.get("/", wrap(c.list));
  router.get("/due", wrap(c.due));
  router.post("/", wrap(c.create));
  router.get("/:id", wrap(c.getById));
  router.put("/:id", wrap(c.update));
  router.post("/:id/ack", wrap(c.ack));
  router.delete("/:id", wrap(c.remove));

  return router;
}
