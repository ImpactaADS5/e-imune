import { prisma } from "../../lib/prisma";
import { CreateCampaignInput } from "../../lib/validation";
import log, { sanitizeForLog } from "../../lib/log";

export const createCampaign = async (data: CreateCampaignInput) => {
  log.debug({ data: sanitizeForLog(data) }, "CampaignService.createCampaign: iniciando criação da campanha.");
  const campaign = await prisma.campaign.create({
    data: {
      ...data,
      dataInicio: new Date(data.dataInicio),
      dataFim: new Date(data.dataFim),
    },
  });
  log.info({ campaign: sanitizeForLog(campaign) }, "CampaignService.createCampaign: campanha criada no banco.");
  return campaign;
};

export const getAllCampaigns = async () => {
  log.debug({}, "CampaignService.getAllCampaigns: buscando campanhas cadastradas.");
  const campaigns = await prisma.campaign.findMany({
    include: { vaccines: { include: { vaccine: true } } },
    orderBy: [{ destaque: "desc" }, { dataFim: "asc" }],
  });
  log.info({ count: campaigns.length, campaigns: sanitizeForLog(campaigns) }, "CampaignService.getAllCampaigns: campanhas carregadas.");
  return campaigns;
};
