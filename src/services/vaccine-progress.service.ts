import { diffDays } from "../lib/dates";

export interface VaccineLite {
  id: string;
  nome: string;
  dosesRecomendadas: number | null;
}

export interface RecordLite {
  id: string;
  vaccineId: string;
  vaccineNome: string;
  dose: string | null;
  dataAplicacao: string; // YYYY-MM-DD
  proximaDose: string | null; // YYYY-MM-DD
}

export type NextDoseStatus = "OVERDUE" | "DUE_SOON" | "UPCOMING" | "SCHEDULED";

export interface NextDose {
  recordId: string;
  vaccineId: string;
  vaccineNome: string;
  doseLabel: string;
  dataPrevista: string;
  diasRestantes: number; // negativo = atrasada
  status: NextDoseStatus;
}

export const DISCLAIMER =
  "Calculado apenas com os registros feitos no e-Immune. Não comprova que o calendário vacinal oficial está completo.";

/* ------------------------------------------------------------------ */
/* Progresso geral                                                     */
/* ------------------------------------------------------------------ */
/**
 * Regra (ajustável aqui em um só lugar):
 *  - Para cada vacina do catálogo, esperado = dosesRecomendadas (ou 1 se vazio).
 *  - Aplicado = nº de registros do usuário dessa vacina, limitado ao esperado.
 *  - percent = soma(aplicado) / soma(esperado), arredondado.
 */
export function calcProgress(vaccines: VaccineLite[], records: RecordLite[]) {
  const countByVaccine = new Map<string, number>();
  for (const r of records) {
    countByVaccine.set(r.vaccineId, (countByVaccine.get(r.vaccineId) ?? 0) + 1);
  }

  let expectedDoses = 0;
  let appliedDoses = 0;
  for (const v of vaccines) {
    const expected = v.dosesRecomendadas && v.dosesRecomendadas > 0 ? v.dosesRecomendadas : 1;
    expectedDoses += expected;
    appliedDoses += Math.min(countByVaccine.get(v.id) ?? 0, expected);
  }

  const percent = expectedDoses === 0 ? 0 : Math.round((appliedDoses / expectedDoses) * 100);
  return { percent, appliedDoses, expectedDoses, message: progressMessage(percent) };
}

export function progressMessage(percent: number): string {
  if (percent >= 80) return "Excelente progresso!";
  if (percent >= 40) return "Bom progresso!";
  return "Vamos começar!";
}

/* ------------------------------------------------------------------ */
/* Próximas doses                                                      */
/* ------------------------------------------------------------------ */
export function statusFromDays(dias: number): NextDoseStatus {
  if (dias < 0) return "OVERDUE";
  if (dias <= 7) return "DUE_SOON";
  if (dias <= 30) return "UPCOMING";
  return "SCHEDULED";
}

/** "1ª dose" -> "2ª dose". Sem número reconhecível -> "Próxima dose". */
export function nextDoseLabel(dose: string | null): string {
  const match = dose?.match(/(\d+)/);
  return match ? `${Number(match[1]) + 1}ª dose` : "Próxima dose";
}

/**
 * Para cada vacina vale só o registro MAIS RECENTE (por data de aplicação).
 * Se ele tem `proximaDose`, existe uma dose pendente. Registrar a dose seguinte
 * (nova aplicação) naturalmente "resolve" a pendência anterior.
 */
export function calcNextDoses(records: RecordLite[], today: string): NextDose[] {
  const latestByVaccine = new Map<string, RecordLite>();
  for (const r of records) {
    const current = latestByVaccine.get(r.vaccineId);
    if (!current || r.dataAplicacao >= current.dataAplicacao) latestByVaccine.set(r.vaccineId, r);
  }

  return [...latestByVaccine.values()]
    .filter((r): r is RecordLite & { proximaDose: string } => r.proximaDose !== null)
    .map((r) => {
      const diasRestantes = diffDays(today, r.proximaDose);
      return {
        recordId: r.id,
        vaccineId: r.vaccineId,
        vaccineNome: r.vaccineNome,
        doseLabel: nextDoseLabel(r.dose),
        dataPrevista: r.proximaDose,
        diasRestantes,
        status: statusFromDays(diasRestantes),
      };
    })
    .sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));
}

export function buildSummary(
  vaccines: VaccineLite[],
  records: RecordLite[],
  today: string
) {
  const progress = calcProgress(vaccines, records);
  const nextDoses = calcNextDoses(records, today);
  return {
    ...progress,
    totalRecords: records.length,
    overdueCount: nextDoses.filter((d) => d.status === "OVERDUE").length,
    nextDose: nextDoses[0] ?? null,
    disclaimer: DISCLAIMER,
  };
}
