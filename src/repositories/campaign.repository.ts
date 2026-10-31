export interface CampaignRow {
  id: string;
  titulo: string;
  descricao: string;
  publicoAlvo: string | null;
  /** YYYY-MM-DD */
  inicio: string;
  /** YYYY-MM-DD (último dia da campanha, inclusive) */
  fim: string;
  destaque: boolean;
}

export interface CampaignRepo {
  /** Campanhas marcadas como destaque que cobrem o dia `today` (YYYY-MM-DD). */
  listHighlighted(today: string): Promise<CampaignRow[]>;
}
