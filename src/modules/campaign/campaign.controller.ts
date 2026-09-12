import { Request, Response } from "express";
import * as campaignService from "./campaign.service";

export const create = async (req: Request, res: Response) => {
  try {
    const result = await campaignService.createCampaign(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao criar campanha", detalhes: error.message });
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