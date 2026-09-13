import { Request, Response } from "express";
import * as reminderService from "./reminder.service";
import { reminderSchema } from "../../lib/validation";

export const create = async (req: Request, res: Response) => {
  try {
    const parsed = reminderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Dados inválidos.", details: parsed.error.flatten() });
    const result = await reminderService.createReminder(req.user!.userId, parsed.data);
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    if ((error as { code?: string }).code === "VACCINE_RECORD_NOT_FOUND") {
      return res.status(404).json({ error: "Registro de vacina não encontrado." });
    }
    res.status(500).json({ error: "Erro ao criar lembrete" });
  }
};

export const list = async (req: Request, res: Response) => {
  try {
    const result = await reminderService.getAllReminders(req.user!.userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar lembretes" });
  }
};
