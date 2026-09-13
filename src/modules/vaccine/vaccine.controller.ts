import { Request, Response } from "express";
import * as vaccineService from "./vaccine.service";
import { vaccineSchema } from "../../lib/validation";

export const create = async (req: Request, res: Response) => {
  try {
    const parsed = vaccineSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Dados inválidos.", details: parsed.error.flatten() });
    const result = await vaccineService.createVaccine(parsed.data);
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar vacina" });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    await vaccineService.deleteVaccine(String(req.params.id));
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    if ((error as { code?: string }).code === "P2025") return res.status(404).json({ error: "Vacina não encontrada." });
    if ((error as { code?: string }).code === "P2003") return res.status(409).json({ error: "Vacina possui registros e não pode ser removida." });
    return res.status(500).json({ error: "Erro ao remover vacina" });
  }
};

export const list = async (req: Request, res: Response) => {
  try {
    const result = await vaccineService.getAllVaccines();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar vacinas" });
  }
};
