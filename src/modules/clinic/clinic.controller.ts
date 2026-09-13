import { Request, Response } from "express";
import * as clinicService from "./clinic.service";
import { clinicSchema } from "../../lib/validation";

export const create = async (req: Request, res: Response) => {
  try {
    const parsed = clinicSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Dados inválidos.", details: parsed.error.flatten() });
    const result = await clinicService.createClinic(parsed.data);
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar clínica" });
  }
};

export const list = async (req: Request, res: Response) => {
  try {
    const result = await clinicService.getAllClinics();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar clínicas" });
  }
};
