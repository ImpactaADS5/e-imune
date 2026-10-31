import { toDate, toISO } from "../lib/dates";
import { prisma } from "./prisma-vaccine-record.repo";
import type { CampaignRepo, CampaignRow } from "./campaign.repository";

function toRow(c: any): CampaignRow {
  return {
    id: c.id,
    titulo: c.titulo,
    descricao: c.descricao,
    publicoAlvo: c.publicoAlvo,
    inicio: toISO(c.inicio),
    fim: toISO(c.fim),
    destaque: c.destaque,
  };
}

export const prismaCampaignRepo: CampaignRepo = {
  async listHighlighted(today) {
    const day = toDate(today);
    const rows = await prisma.campaign.findMany({
      where: { destaque: true, inicio: { lte: day }, fim: { gte: day } },
      orderBy: [{ fim: "asc" }, { inicio: "asc" }],
    });
    return rows.map(toRow);
  },
};
