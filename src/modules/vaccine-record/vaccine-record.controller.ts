import { Request, Response } from "express";
import * as vaccineRecordService from "./vaccine-record.service";
import { vaccineRecordSchema } from "../../lib/validation";
import log, { describeError, sanitizeForLog } from "../../lib/log";

export const create = async (req: Request, res: Response) => {
  log.debug({ requestId: (req as any).requestId, userId: (req as any).user?.userId, body: sanitizeForLog(req.body) }, "VaccineRecordController.create: requisição recebida.");
  
  try {
    const parsed = vaccineRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      log.warn({ requestId: (req as any).requestId, validation: parsed.error.flatten() }, "VaccineRecordController.create: dados inválidos.");
      return res.status(400).json({ error: "Dados inválidos.", details: parsed.error.flatten() });
    }
    
    if (new Date(parsed.data.dataAplicacao) > new Date()) {
      log.warn({ requestId: (req as any).requestId, dataAplicacao: parsed.data.dataAplicacao }, "VaccineRecordController.create: data de aplicação futura rejeitada.");
      return res.status(400).json({ error: "A data da aplicação não pode ser futura." });
    }
    
    if (parsed.data.dataProximaDose && new Date(parsed.data.dataProximaDose) <= new Date(parsed.data.dataAplicacao)) {
      log.warn({ requestId: (req as any).requestId, dataAplicacao: parsed.data.dataAplicacao, dataProximaDose: parsed.data.dataProximaDose }, "VaccineRecordController.create: intervalo entre doses inválido.");
      return res.status(400).json({ error: "A próxima dose deve ser posterior à aplicação." });
    }
    
    // Forçar o tipo para evitar conflitos estritos do TypeScript
    const result = await vaccineRecordService.createVaccineRecord({
      userId: String((req as any).user!.userId),
      ...parsed.data
    } as any);
    
    log.info({ requestId: (req as any).requestId, record: sanitizeForLog(result) }, "VaccineRecordController.create: resposta de criação enviada.");
    res.status(201).json(result);
  } catch (error) {
    log.error({ requestId: (req as any).requestId, error: describeError(error) }, "VaccineRecordController.create: erro ao criar registro.");
    if ((error as { code?: string }).code === "P2003") return res.status(404).json({ error: "Vacina não encontrada." });
    res.status(500).json({ error: "Erro ao criar registro de vacina" });
  }
};

export const list = async (req: Request, res: Response) => {
  log.debug({ requestId: (req as any).requestId, userId: (req as any).user?.userId }, "VaccineRecordController.list: requisição recebida.");
  try {
    const result = await vaccineRecordService.getAllVaccineRecords(String((req as any).user!.userId));
    log.info({ requestId: (req as any).requestId, userId: (req as any).user?.userId, count: result.length }, "VaccineRecordController.list: registros enviados.");
    res.status(200).json(result);
  } catch (error) {
    log.error({ requestId: (req as any).requestId, error: describeError(error) }, "VaccineRecordController.list: erro ao listar registros.");
    res.status(500).json({ error: "Erro ao listar registros" });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Forçar os tipos para string e any para contornar a verificação estrita
    const result = await vaccineRecordService.updateVaccineRecord(id as string, req.body as any);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao atualizar registro", detalhes: error.message });
  }
};

export const progress = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const result = await vaccineRecordService.getVaccinationProgress(userId as string);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao calcular progresso", detalhes: error.message });
  }
};

export const nextDoses = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const result = await vaccineRecordService.getNextDoses(userId as string);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao buscar próximas doses", detalhes: error.message });
  }
};