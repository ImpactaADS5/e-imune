import { Request, Response } from "express";
import * as vaccineRecordService from "./vaccine-record.service";

export const create = async (req: Request, res: Response) => {
  try {
    const result = await vaccineRecordService.createVaccineRecord(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao criar registro de vacina", detalhes: error.message });
  }
};

export const list = async (req: Request, res: Response) => {
  try {
    const result = await vaccineRecordService.getAllVaccineRecords();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar registros" });
  }
};