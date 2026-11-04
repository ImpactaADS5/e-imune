import { Request, Response } from "express";
import * as reminderService from "./reminder.service";
import { validateReminderCreate, validateReminderUpdate } from "../../services/reminder.validation";
import log, { describeError } from "../../lib/log";

const NOT_FOUND = { error: "Lembrete não encontrado." };

function userId(req: Request): string {
  return req.user!.userId;
}

function invalid(res: Response, errors: Record<string, string>) {
  return res.status(400).json({ error: errors._ ?? "Dados inválidos.", errors });
}

function handleError(req: Request, res: Response, error: unknown, context: string) {
  if (error instanceof reminderService.ReminderError) {
    const body = error.field ? { error: error.message, errors: { [error.field]: error.message } } : { error: error.message };
    return res.status(error.status).json(body);
  }
  log.error({ requestId: req.requestId, error: describeError(error) }, `ReminderController.${context}: erro inesperado.`);
  return res.status(500).json({ error: "Erro ao processar o lembrete." });
}

/** GET /reminders — lembretes do usuário com disparo e status calculados */
export const list = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(await reminderService.listReminders(userId(req)));
  } catch (error) {
    return handleError(req, res, error, "list");
  }
};

/** GET /reminders/due — o que já deveria ter avisado e ainda não foi visto (sino da Home) */
export const due = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(await reminderService.listDueReminders(userId(req)));
  } catch (error) {
    return handleError(req, res, error, "due");
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const reminder = await reminderService.getReminder(String(req.params.id), userId(req));
    if (!reminder) return res.status(404).json(NOT_FOUND);
    return res.status(200).json(reminder);
  } catch (error) {
    return handleError(req, res, error, "getById");
  }
};

/** POST /reminders — um lembrete por registro de vacina */
export const create = async (req: Request, res: Response) => {
  const { errors, ok, value } = validateReminderCreate(req.body);
  if (!ok) return invalid(res, errors);

  try {
    const { vaccineRecordId, ...fields } = value;
    return res.status(201).json(await reminderService.createReminder(userId(req), vaccineRecordId, fields));
  } catch (error) {
    return handleError(req, res, error, "create");
  }
};

/** PUT /reminders/:id — toggle, antecedência e horário (campos parciais) */
export const update = async (req: Request, res: Response) => {
  const { errors, ok, value } = validateReminderUpdate(req.body);
  if (!ok) return invalid(res, errors);

  try {
    const reminder = await reminderService.updateReminder(String(req.params.id), userId(req), value);
    if (!reminder) return res.status(404).json(NOT_FOUND);
    return res.status(200).json(reminder);
  } catch (error) {
    return handleError(req, res, error, "update");
  }
};

/** POST /reminders/:id/ack — marca o aviso atual como visto */
export const ack = async (req: Request, res: Response) => {
  try {
    const reminder = await reminderService.ackReminder(String(req.params.id), userId(req));
    if (!reminder) return res.status(404).json(NOT_FOUND);
    return res.status(200).json(reminder);
  } catch (error) {
    return handleError(req, res, error, "ack");
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const deleted = await reminderService.deleteReminder(String(req.params.id), userId(req));
    if (!deleted) return res.status(404).json(NOT_FOUND);
    return res.status(204).send();
  } catch (error) {
    return handleError(req, res, error, "remove");
  }
};
