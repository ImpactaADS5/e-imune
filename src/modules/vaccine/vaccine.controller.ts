import { Request, Response } from "express";
import * as vaccineService from "./vaccine.service";
import { vaccineSchema } from "../../lib/validation";
import log, { describeError, sanitizeForLog } from "../../lib/log";

export const create = async (req: Request, res: Response) => {
  log.debug({ requestId: req.requestId, body: sanitizeForLog(req.body) }, "VaccineController.create: requisição recebida.");
  try {
    const parsed = vaccineSchema.safeParse(req.body);
    if (!parsed.success) {
      log.warn({ requestId: req.requestId, validation: parsed.error.flatten() }, "VaccineController.create: dados inválidos.");
      return res.status(400).json({ error: "Dados inválidos.", details: parsed.error.flatten() });
    }
    const result = await vaccineService.createVaccine(parsed.data);
    log.info({ requestId: req.requestId, vaccine: sanitizeForLog(result) }, "VaccineController.create: resposta de criação enviada.");
    res.status(201).json(result);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "VaccineController.create: erro ao criar vacina.");
    res.status(500).json({ error: "Erro ao criar vacina" });
  }
};

export const remove = async (req: Request, res: Response) => {
  log.debug({ requestId: req.requestId, id: req.params.id }, "VaccineController.remove: requisição de remoção recebida.");
  try {
    await vaccineService.deleteVaccine(String(req.params.id));
    return res.status(204).send();
  } catch (error) {
    log.error({ requestId: req.requestId, id: req.params.id, error: describeError(error) }, "VaccineController.remove: erro ao remover vacina.");
    if ((error as { code?: string }).code === "P2025") return res.status(404).json({ error: "Vacina não encontrada." });
    if ((error as { code?: string }).code === "P2003") return res.status(409).json({ error: "Vacina possui registros e não pode ser removida." });
    return res.status(500).json({ error: "Erro ao remover vacina" });
  }
};

export const list = async (req: Request, res: Response) => {
  log.debug({ requestId: req.requestId }, "VaccineController.list: requisição de catálogo recebida.");
  try {
    const result = await vaccineService.getAllVaccines();
    log.info({ requestId: req.requestId, count: result.length }, "VaccineController.list: catálogo enviado.");
    res.status(200).json(result);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "VaccineController.list: erro ao listar vacinas.");
    res.status(500).json({ error: "Erro ao listar vacinas" });
  }
};
