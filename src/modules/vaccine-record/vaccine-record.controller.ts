import { Request, Response } from "express";
import * as vaccineRecordService from "./vaccine-record.service";
import { describeError } from "../../lib/log";
import log from "../../lib/log";
import { todayISO } from "../../lib/dates";
import { validateRecordInput } from "../../services/vaccine-record.validation";

function userId(req: Request): string {
  return req.user!.userId;
}

function validateBody(body: unknown, res: Response) {
  const result = validateRecordInput(body, todayISO());
  if (!result.ok) {
    res.status(400).json({ error: "Dados inválidos.", errors: result.errors });
    return null;
  }
  return result.value;
}

export const create = async (req: Request, res: Response) => {
  const value = validateBody(req.body, res);
  if (!value) return;

  try {
    const result = await vaccineRecordService.createVaccineRecord({ userId: userId(req), ...value });
    return res.status(201).json(result);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "VaccineRecordController.create: erro ao criar registro.");
    if (error instanceof vaccineRecordService.InvalidDoseError) {
      return res.status(400).json({ error: error.message, errors: { dose: error.message } });
    }
    if ((error as { code?: string }).code === "P2003") {
      return res.status(404).json({ error: "Vacina não encontrada." });
    }
    return res.status(500).json({ error: "Erro ao criar registro de vacina." });
  }
};

export const list = async (req: Request, res: Response) => {
  try {
    const records = await vaccineRecordService.getAllVaccineRecords(userId(req));
    return res.status(200).json(records);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "VaccineRecordController.list: erro ao listar registros.");
    return res.status(500).json({ error: "Erro ao listar registros." });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const record = await vaccineRecordService.getVaccineRecordById(String(req.params.id), userId(req));
    if (!record) return res.status(404).json({ error: "Registro não encontrado." });
    return res.status(200).json(record);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "VaccineRecordController.getById: erro ao buscar registro.");
    return res.status(500).json({ error: "Erro ao buscar registro." });
  }
};

export const update = async (req: Request, res: Response) => {
  const value = validateBody(req.body, res);
  if (!value) return;

  try {
    const result = await vaccineRecordService.updateVaccineRecord(
      String(req.params.id),
      userId(req),
      { userId: userId(req), ...value }
    );
    if (!result) return res.status(404).json({ error: "Registro não encontrado." });
    return res.status(200).json(result);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "VaccineRecordController.update: erro ao atualizar registro.");
    if (error instanceof vaccineRecordService.InvalidDoseError) {
      return res.status(400).json({ error: error.message, errors: { dose: error.message } });
    }
    if ((error as { code?: string }).code === "P2003") {
      return res.status(404).json({ error: "Vacina não encontrada." });
    }
    return res.status(500).json({ error: "Erro ao atualizar registro." });
  }
};

export const summary = async (req: Request, res: Response) => {
  try {
    const result = await vaccineRecordService.getVaccineRecordSummary(userId(req));
    return res.status(200).json(result);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "VaccineRecordController.summary: erro ao calcular resumo.");
    return res.status(500).json({ error: "Erro ao calcular o resumo de vacinação." });
  }
};

export const nextDosesSummary = async (req: Request, res: Response) => {
  try {
    const result = await vaccineRecordService.getNextDoseSummary(userId(req));
    return res.status(200).json(result);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "VaccineRecordController.nextDosesSummary: erro ao buscar próximas doses.");
    return res.status(500).json({ error: "Erro ao buscar próximas doses." });
  }
};

export const progress = async (req: Request, res: Response) => {
  try {
    // Mantém a URL antiga, mas sempre usa o usuário autenticado para evitar acesso cruzado.
    const result = await vaccineRecordService.getVaccinationProgress(userId(req));
    return res.status(200).json(result);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "VaccineRecordController.progress: erro ao calcular progresso.");
    return res.status(500).json({ error: "Erro ao calcular progresso." });
  }
};

export const nextDoses = async (req: Request, res: Response) => {
  try {
    // Mantém compatibilidade com a tela que ainda envia /next-doses/:userId.
    const result = await vaccineRecordService.getNextDoses(userId(req));
    return res.status(200).json(result);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "VaccineRecordController.nextDoses: erro ao buscar próximas doses.");
    return res.status(500).json({ error: "Erro ao buscar próximas doses." });
  }
};
