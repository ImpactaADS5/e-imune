import { Request, Response } from "express";
import * as campaignService from "./campaign.service";
import { campaignSchema } from "../../lib/validation";
import log, { describeError, sanitizeForLog } from "../../lib/log";
import { todayISO } from "../../lib/dates";
import { parseLimit } from "../../services/campaign.service";

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

/** GET /campaigns/featured?limit=5 */
export const featured = async (req: Request, res: Response) => {
  const { limit, error } = parseLimit(req.query.limit);
  if (error) return res.status(400).json({ error, errors: { limit: error } });

  try {
    return res.status(200).json(await campaignService.getFeaturedCampaigns(todayISO(), limit));
  } catch (err) {
    log.error({ requestId: req.requestId, error: describeError(err) }, "CampaignController.featured: erro ao buscar campanhas em destaque.");
    return res.status(500).json({ error: "Erro ao buscar campanhas em destaque." });
  }
};
