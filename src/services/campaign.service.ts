import { diffDays } from "../lib/dates";

/** Campanha no formato da API (datas "YYYY-MM-DD"). */
export interface CampaignRow {
  id: string;
  titulo: string;
  descricao: string;
  publicoAlvo: string | null;
  inicio: string;
  fim: string;
  destaque: boolean;
  imagemUrl: string | null;
}

export interface FeaturedCampaign extends CampaignRow {
  /** Dias até o último dia da campanha (0 = termina hoje). */
  diasRestantes: number;
}

export const DEFAULT_FEATURED_LIMIT = 5;
export const MAX_FEATURED_LIMIT = 10;

/** Só campanhas em destaque e em andamento hoje; as que terminam antes vêm primeiro. */
export function pickFeatured(rows: CampaignRow[], today: string, limit = DEFAULT_FEATURED_LIMIT): FeaturedCampaign[] {
  return rows
    .filter((c) => c.destaque && c.inicio <= today && c.fim >= today)
    .map((c) => ({ ...c, diasRestantes: diffDays(today, c.fim) }))
    .sort((a, b) => a.fim.localeCompare(b.fim) || a.inicio.localeCompare(b.inicio))
    .slice(0, limit);
}

/** Lê ?limit= (opcional). */
export function parseLimit(raw: unknown): { limit: number; error?: string } {
  if (raw === undefined || raw === "") return { limit: DEFAULT_FEATURED_LIMIT };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > MAX_FEATURED_LIMIT) {
    return { limit: DEFAULT_FEATURED_LIMIT, error: `O limite deve ser um inteiro de 1 a ${MAX_FEATURED_LIMIT}.` };
  }
  return { limit: n };
}
