import prisma from "../../lib/prisma";

interface CreateCampaignData {
  titulo: string;
  descricao: string;
  destaque?: boolean;
  dataInicio: string; // Vem como string ISO do JSON
  dataFim: string;
  imagemUrl?: string;
}

export const createCampaign = async (data: CreateCampaignData) => {
  return await prisma.campaign.create({
    data: {
      ...data,
      dataInicio: new Date(data.dataInicio),
      dataFim: new Date(data.dataFim),
    },
  });
};

export const getAllCampaigns = async () => {
  return await prisma.campaign.findMany();
};