import { Request, Response } from "express";
import * as clinicService from "./clinic.service";

export const create = async (req: Request, res: Response) => {
  try {
    const result = await clinicService.createClinic(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao criar clínica", detalhes: error.message });
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