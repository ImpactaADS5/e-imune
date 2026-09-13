import { Request, Response } from "express";
import * as vaccineRecordService from "./vaccine-record.service";
import { vaccineRecordSchema } from "../../lib/validation";

export const create = async (req: Request, res: Response) => {
  try {
    const parsed = vaccineRecordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Dados inválidos.", details: parsed.error.flatten() });
    if (new Date(parsed.data.dataAplicacao) > new Date()) {
      return res.status(400).json({ error: "A data da aplicação não pode ser futura." });
    }
    if (parsed.data.dataProximaDose && new Date(parsed.data.dataProximaDose) <= new Date(parsed.data.dataAplicacao)) {
      return res.status(400).json({ error: "A próxima dose deve ser posterior à aplicação." });
    }
    const result = await vaccineRecordService.createVaccineRecord(req.user!.userId, parsed.data);
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    if ((error as { code?: string }).code === "P2003") return res.status(404).json({ error: "Vacina não encontrada." });
    res.status(500).json({ error: "Erro ao criar registro de vacina" });
  }
};

export const list = async (req: Request, res: Response) => {
  try {
    const result = await vaccineRecordService.getAllVaccineRecords(req.user!.userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar registros" });
  }
};
