import { isValidISODate } from "../lib/dates";

export interface RecordInput {
  vaccineId: string;
  dose: string | null;
  dataAplicacao: string;
  proximaDose: string | null;
  local: string | null;
  lote: string | null;
  observacoes: string | null;
}

const clean = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

/**
 * Regras da Tela 5 (RN01–RN04) + campo opcional proximaDose.
 * `today` vem de todayISO() (fuso de SP) para ser testável.
 */
export function validateRecordInput(body: any, today: string) {
  const errors: Record<string, string> = {};
  const b = body ?? {};

  const vaccineId = clean(b.vaccineId);
  if (!vaccineId) errors.vaccineId = "Selecione a vacina.";

  let dataAplicacao = "";
  if (!b.dataAplicacao) {
    errors.dataAplicacao = "Informe a data da aplicação.";
  } else if (!isValidISODate(b.dataAplicacao)) {
    errors.dataAplicacao = "Data inválida.";
  } else if (b.dataAplicacao > today) {
    errors.dataAplicacao = "A data da aplicação não pode ser futura.";
  } else {
    dataAplicacao = b.dataAplicacao;
  }

  let proximaDose: string | null = null;
  if (b.proximaDose) {
    if (!isValidISODate(b.proximaDose)) {
      errors.proximaDose = "Data da próxima dose inválida.";
    } else if (dataAplicacao && b.proximaDose <= dataAplicacao) {
      errors.proximaDose = "A próxima dose deve ser depois da data de aplicação.";
    } else {
      proximaDose = b.proximaDose;
    }
  }

  const observacoes = clean(b.observacoes);
  if (observacoes && observacoes.length > 200) {
    errors.observacoes = "Máximo de 200 caracteres.";
  }

  const value: RecordInput = {
    vaccineId: vaccineId ?? "",
    dose: clean(b.dose),
    dataAplicacao,
    proximaDose,
    local: clean(b.local),
    lote: clean(b.lote),
    observacoes,
  };
  return { errors, value, ok: Object.keys(errors).length === 0 };
}
