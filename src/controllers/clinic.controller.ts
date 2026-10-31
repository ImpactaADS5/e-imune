import type { Request, Response } from "express";
import { boundingBox } from "../lib/geo";
import type { ClinicRepo } from "../repositories/clinic.repository";
import { rankNearby, validateNearbyQuery } from "../services/clinic.service";

export function createClinicController(repo: ClinicRepo) {
  return {
    /** GET /clinics/nearby?lat=-23.6&lng=-46.78&raio=10&limit=10 */
    async nearby(req: Request, res: Response) {
      const { errors, ok, value } = validateNearbyQuery(req.query as Record<string, unknown>);
      if (!ok || !value) return res.status(400).json({ message: "Parâmetros inválidos.", errors });

      const candidates = await repo.listInBox(boundingBox(value.lat, value.lng, value.raio));
      res.json(rankNearby(candidates, value));
    },
  };
}
