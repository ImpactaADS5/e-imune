import { Request, Response } from "express";
import * as reminderService from "./reminder.service";
import { reminderSchema } from "../../lib/validation";
import log, { describeError, sanitizeForLog } from "../../lib/log";

export const create = async (req: Request, res: Response) => {
  log.debug({ requestId: req.requestId, userId: req.user?.userId, body: sanitizeForLog(req.body) }, "ReminderController.create: requisição recebida.");
  try {
    const parsed = reminderSchema.safeParse(req.body);
    if (!parsed.success) {
      log.warn({ requestId: req.requestId, validation: parsed.error.flatten() }, "ReminderController.create: dados inválidos.");
      return res.status(400).json({ error: "Dados inválidos.", details: parsed.error.flatten() });
    }
    const result = await reminderService.createReminder(req.user!.userId, parsed.data);
    log.info({ requestId: req.requestId, reminder: sanitizeForLog(result) }, "ReminderController.create: resposta de criação enviada.");
    res.status(201).json(result);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "ReminderController.create: erro ao criar lembrete.");
    if ((error as { code?: string }).code === "VACCINE_RECORD_NOT_FOUND") {
      return res.status(404).json({ error: "Registro de vacina não encontrado." });
    }
    res.status(500).json({ error: "Erro ao criar lembrete" });
  }
};

export const list = async (req: Request, res: Response) => {
  log.debug({ requestId: req.requestId, userId: req.user?.userId }, "ReminderController.list: requisição recebida.");
  try {
    const result = await reminderService.getAllReminders(req.user!.userId);
    log.info({ requestId: req.requestId, userId: req.user?.userId, count: result.length }, "ReminderController.list: lembretes enviados.");
    res.status(200).json(result);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "ReminderController.list: erro ao listar lembretes.");
    res.status(500).json({ error: "Erro ao listar lembretes" });
  }
};
