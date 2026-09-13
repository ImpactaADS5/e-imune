import { Request, Response } from "express";
import * as vaccineRecordService from "./vaccine-record.service";
import { vaccineRecordSchema } from "../../lib/validation";
import log, { describeError, sanitizeForLog } from "../../lib/log";

export const create = async (req: Request, res: Response) => {
  log.debug({ requestId: req.requestId, userId: req.user?.userId, body: sanitizeForLog(req.body) }, "VaccineRecordController.create: requisição recebida.");
  try {
    const parsed = vaccineRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      log.warn({ requestId: req.requestId, validation: parsed.error.flatten() }, "VaccineRecordController.create: dados inválidos.");
      return res.status(400).json({ error: "Dados inválidos.", details: parsed.error.flatten() });
    }
    if (new Date(parsed.data.dataAplicacao) > new Date()) {
      log.warn({ requestId: req.requestId, dataAplicacao: parsed.data.dataAplicacao }, "VaccineRecordController.create: data de aplicação futura rejeitada.");
      return res.status(400).json({ error: "A data da aplicação não pode ser futura." });
    }
    if (parsed.data.dataProximaDose && new Date(parsed.data.dataProximaDose) <= new Date(parsed.data.dataAplicacao)) {
      log.warn({ requestId: req.requestId, dataAplicacao: parsed.data.dataAplicacao, dataProximaDose: parsed.data.dataProximaDose }, "VaccineRecordController.create: intervalo entre doses inválido.");
      return res.status(400).json({ error: "A próxima dose deve ser posterior à aplicação." });
    }
    const result = await vaccineRecordService.createVaccineRecord(req.user!.userId, parsed.data);
    log.info({ requestId: req.requestId, record: sanitizeForLog(result) }, "VaccineRecordController.create: resposta de criação enviada.");
    res.status(201).json(result);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "VaccineRecordController.create: erro ao criar registro.");
    if ((error as { code?: string }).code === "P2003") return res.status(404).json({ error: "Vacina não encontrada." });
    res.status(500).json({ error: "Erro ao criar registro de vacina" });
  }
};

export const list = async (req: Request, res: Response) => {
  log.debug({ requestId: req.requestId, userId: req.user?.userId }, "VaccineRecordController.list: requisição recebida.");
  try {
    const result = await vaccineRecordService.getAllVaccineRecords(req.user!.userId);
    log.info({ requestId: req.requestId, userId: req.user?.userId, count: result.length }, "VaccineRecordController.list: registros enviados.");
    res.status(200).json(result);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "VaccineRecordController.list: erro ao listar registros.");
    res.status(500).json({ error: "Erro ao listar registros" });
  }
};
