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

  const dose = clean(b.dose);
  if (dose && dose.length > 40) {
    errors.dose = "Máximo de 40 caracteres.";
  } else if (dose) {
    const number = dose.match(/\d+/)?.[0];
    const isSpecialLabel = /reforço|reforco|dose\s+única|dose\s+unica/i.test(dose);
    if (number && (Number(number) < 1 || Number(number) > 20)) {
      errors.dose = "O número da dose deve estar entre 1 e 20.";
    } else if (!number && !isSpecialLabel) {
      errors.dose = "Informe o número da dose ou use ‘Reforço’.";
    }
  }

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

  const local = clean(b.local);
  if (local && local.length > 200) errors.local = "Máximo de 200 caracteres.";

  const lote = clean(b.lote);
  if (lote && lote.length > 100) errors.lote = "Máximo de 100 caracteres.";

  const value: RecordInput = {
    vaccineId: vaccineId ?? "",
    dose,
    dataAplicacao,
    proximaDose,
    local,
    lote,
    observacoes,
  };
  return { errors, value, ok: Object.keys(errors).length === 0 };
}
