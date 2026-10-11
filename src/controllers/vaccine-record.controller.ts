import type { Request, Response } from "express";
import { todayISO } from "../lib/dates";
import type { VaccineRecordRepo } from "../repositories/vaccine-record.repository";
import { buildSummary, calcNextDoses } from "../services/vaccine-progress.service";
import { validateRecordInput } from "../services/vaccine-record.validation";

const idParam = (req: Request) => String(req.params.id);

export function createVaccineRecordController(repo: VaccineRecordRepo) {
  return {
    /** GET /vaccine-records/summary — progresso geral + próxima dose */
    async summary(req: Request, res: Response) {
      const [vaccines, records] = await Promise.all([
        repo.listVaccines(),
        repo.listByUser(req.userId!),
      ]);
      res.json(buildSummary(vaccines, records, todayISO()));
    },

    /** GET /vaccine-records/next-doses — lista com dias restantes e status */
    async nextDoses(req: Request, res: Response) {
      const records = await repo.listByUser(req.userId!);
      res.json(calcNextDoses(records, todayISO()));
    },

    /** GET /vaccine-records/:id */
    async getById(req: Request, res: Response) {
      const record = await repo.findByIdForUser(idParam(req), req.userId!);
      if (!record) return res.status(404).json({ message: "Registro não encontrado." });
      res.json(record);
    },

    /** PUT /vaccine-records/:id — edição completa do registro */
    async update(req: Request, res: Response) {
      const id = idParam(req);
      const existing = await repo.findByIdForUser(id, req.userId!);
      if (!existing) return res.status(404).json({ message: "Registro não encontrado." });

      const { errors, value, ok } = validateRecordInput(req.body, todayISO());
      if (ok && !(await repo.vaccineExists(value.vaccineId))) {
        errors.vaccineId = "Vacina não encontrada.";
      }
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ message: "Dados inválidos.", errors });
      }

      const updated = await repo.updateForUser(id, req.userId!, value);
      res.json(updated);
    },
  };
}
