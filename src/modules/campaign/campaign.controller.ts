import { Request, Response } from "express";
import * as campaignService from "./campaign.service";
import { campaignSchema } from "../../lib/validation";
import log, { describeError, sanitizeForLog } from "../../lib/log";

export const create = async (req: Request, res: Response) => {
  log.debug({ requestId: req.requestId, body: sanitizeForLog(req.body) }, "CampaignController.create: requisição recebida.");
  try {
    const parsed = campaignSchema.safeParse(req.body);
    if (!parsed.success) {
      log.warn({ requestId: req.requestId, validation: parsed.error.flatten() }, "CampaignController.create: dados inválidos.");
      return res.status(400).json({ error: "Dados inválidos.", details: parsed.error.flatten() });
    }
    if (new Date(parsed.data.dataInicio) > new Date(parsed.data.dataFim)) {
      log.warn({ requestId: req.requestId, dataInicio: parsed.data.dataInicio, dataFim: parsed.data.dataFim }, "CampaignController.create: período da campanha inválido.");
      return res.status(400).json({ error: "A data de início deve ser anterior à data de fim." });
    }
    const result = await campaignService.createCampaign(parsed.data);
    log.info({ requestId: req.requestId, campaign: sanitizeForLog(result) }, "CampaignController.create: resposta de criação enviada.");
    res.status(201).json(result);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "CampaignController.create: erro ao criar campanha.");
    res.status(500).json({ error: "Erro ao criar campanha" });
  }
};

export const list = async (req: Request, res: Response) => {
  log.debug({ requestId: req.requestId }, "CampaignController.list: requisição de campanhas recebida.");
  try {
    const result = await campaignService.getAllCampaigns();
    log.info({ requestId: req.requestId, count: result.length }, "CampaignController.list: campanhas enviadas.");
    res.status(200).json(result);
  } catch (error) {
    log.error({ requestId: req.requestId, error: describeError(error) }, "CampaignController.list: erro ao listar campanhas.");
    res.status(500).json({ error: "Erro ao listar campanhas" });
  }
};
