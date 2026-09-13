import { prisma } from "../../lib/prisma";
import { CreateCampaignInput } from "../../lib/validation";

export const createCampaign = async (data: CreateCampaignInput) => {
  return await prisma.campaign.create({
    data: {
      ...data,
      dataInicio: new Date(data.dataInicio),
      dataFim: new Date(data.dataFim),
    },
  });
};

export const getAllCampaigns = async () => {
  return await prisma.campaign.findMany({
    include: { vaccines: { include: { vaccine: true } } },
    orderBy: [{ destaque: "desc" }, { dataFim: "asc" }],
  });
};
