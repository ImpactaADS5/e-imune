import { Request, Response } from "express";
import * as campaignService from "./campaign.service";
import { campaignSchema } from "../../lib/validation";

export const create = async (req: Request, res: Response) => {
  try {
    const parsed = campaignSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Dados inválidos.", details: parsed.error.flatten() });
    if (new Date(parsed.data.dataInicio) > new Date(parsed.data.dataFim)) {
      return res.status(400).json({ error: "A data de início deve ser anterior à data de fim." });
    }
    const result = await campaignService.createCampaign(parsed.data);
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar campanha" });
  }
};

export const list = async (req: Request, res: Response) => {
  try {
    const result = await campaignService.getAllCampaigns();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar campanhas" });
  }
};
