import type { Request, Response } from "express";
import { todayISO } from "../lib/dates";
import type { CampaignRepo } from "../repositories/campaign.repository";
import { parseLimit, pickFeatured } from "../services/campaign.service";

export function createCampaignController(repo: CampaignRepo, today: () => string = todayISO) {
  return {
    /** GET /campaigns/featured?limit=5 — campanhas em destaque em andamento */
    async featured(req: Request, res: Response) {
      const { limit, error } = parseLimit(req.query.limit);
      if (error) return res.status(400).json({ message: error, errors: { limit: error } });

      const day = today();
      const rows = await repo.listHighlighted(day);
      res.json(pickFeatured(rows, day, limit));
    },
  };
}
