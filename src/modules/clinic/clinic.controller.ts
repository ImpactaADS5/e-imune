import { Request, Response } from "express";
import * as clinicService from "./clinic.service";
import { clinicSchema } from "../../lib/validation";
import log, { describeError, sanitizeForLog } from "../../lib/log";

export const create = async (req: Request, res: Response) => {
  log.debug({ requestId: req.requestId, body: sanitizeForLog(req.body) }, "ClinicController.create: requisição recebida.");
  try {
    const parsed = clinicSchema.safeParse(req.body);
    if (!parsed.success) {
      log.warn({ requestId: req.requestId, validation: parsed.error.flatten() }, "ClinicController.create: dados inválidos.");
      return res.status(400).json({ error: "Dados inválidos.", details: parsed.error.flatten() });
    }
    const result = await clinicService.createClinic(parsed.data);
    log.info({ requestId: req.requestId, clinic: sanitizeForLog(result) }, "ClinicController.create: resposta de criação enviada.");
    res.status(201).json(result);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "ClinicController.create: erro ao criar clínica.");
    res.status(500).json({ error: "Erro ao criar clínica" });
  }
};

export const list = async (req: Request, res: Response) => {
  log.debug({ requestId: req.requestId }, "ClinicController.list: requisição de clínicas recebida.");
  try {
    const result = await clinicService.getAllClinics();
    log.info({ requestId: req.requestId, count: result.length }, "ClinicController.list: clínicas enviadas.");
    res.status(200).json(result);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "ClinicController.list: erro ao listar clínicas.");
    res.status(500).json({ error: "Erro ao listar clínicas" });
  }
};
