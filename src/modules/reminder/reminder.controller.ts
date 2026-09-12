import { Request, Response } from "express";
import * as reminderService from "./reminder.service";

export const create = async (req: Request, res: Response) => {
  try {
    const result = await reminderService.createReminder(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao criar lembrete", detalhes: error.message });
  }
};

export const list = async (req: Request, res: Response) => {
  try {
    const result = await reminderService.getAllReminders();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar lembretes" });
  }
};