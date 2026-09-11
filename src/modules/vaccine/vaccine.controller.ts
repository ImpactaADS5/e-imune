import { Request, Response } from "express";
import * as vaccineService from "./vaccine.service";

export const create = async (req: Request, res: Response) => {
  try {
    const result = await vaccineService.createVaccine(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      error: "Erro ao criar vacina", 
      detalhes: error.message 
    });
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