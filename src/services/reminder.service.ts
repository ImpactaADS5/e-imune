import { addDays } from "../lib/dates";
import { nextDoseLabel } from "./vaccine-progress.service";

/**
 * O Brasil não tem horário de verão desde 2019, então São Paulo é sempre UTC-03:00.
 * Se um dia o horário de verão voltar, troque este deslocamento por um cálculo com Intl.
 */
export const SP_OFFSET = "-03:00";

export type ReminderStatus =
  | "DESATIVADO" // toggle desligado
  | "SEM_DATA" // o registro não tem mais data de próxima dose
  | "AGENDADO" // ligado, disparo ainda no futuro
  | "PENDENTE" // já deveria ter disparado e o usuário ainda não viu
  | "LIDO"; // usuário já viu esse disparo

/** Lembrete já com os dados do registro de vacina ligado a ele. */
export interface ReminderRow {
  id: string;
  vaccineRecordId: string;
  vaccineNome: string;
  /** Rótulo da dose aplicada no registro (ex.: "1ª Dose"). */
  dose: string | null;
  /** Próxima dose do REGISTRO (YYYY-MM-DD) ou null se o registro não tem. */
  proximaDose: string | null;
  ativo: boolean;
  antecedenciaDias: number;
  /** "HH:mm" no horário de São Paulo. */
  horario: string;
  /** Disparo que o usuário já marcou como lido (coluna lido_para). */
  lidoPara: string | null;
}

export interface ReminderView {
  id: string;
  vaccineRecordId: string;
  vaccineNome: string;
  doseLabel: string;
  dataPrevista: string | null;
  ativo: boolean;
  antecedenciaDias: number;
  horario: string;
  /** Momento do disparo, ex.: "2026-11-09T09:00:00-03:00" (null se não há data). */
  disparoEm: string | null;
  status: ReminderStatus;
}

/** Momento do disparo = (próxima dose − antecedência) às `horario` de São Paulo. */
export function calcDisparoEm(proximaDose: string, antecedenciaDias: number, horario: string): string {
  return `${addDays(proximaDose, -antecedenciaDias)}T${horario}:00${SP_OFFSET}`;
}

export function toReminderView(row: ReminderRow, now: Date = new Date()): ReminderView {
  const disparoEm = row.proximaDose
    ? calcDisparoEm(row.proximaDose, row.antecedenciaDias, row.horario)
    : null;

  let status: ReminderStatus;
  if (!row.ativo) status = "DESATIVADO";
  else if (!disparoEm) status = "SEM_DATA";
  else if (row.lidoPara === disparoEm) status = "LIDO";
  else if (Date.parse(disparoEm) <= now.getTime()) status = "PENDENTE";
  else status = "AGENDADO";

  return {
    id: row.id,
    vaccineRecordId: row.vaccineRecordId,
    vaccineNome: row.vaccineNome,
    doseLabel: nextDoseLabel(row.dose),
    dataPrevista: row.proximaDose,
    ativo: row.ativo,
    antecedenciaDias: row.antecedenciaDias,
    horario: row.horario,
    disparoEm,
    status,
  };
}

/** Lembretes que já deveriam ter disparado e ainda não foram vistos (mais antigos primeiro). */
export function listDue(rows: ReminderRow[], now: Date = new Date()): ReminderView[] {
  return rows
    .map((r) => toReminderView(r, now))
    .filter((v) => v.status === "PENDENTE")
    .sort((a, b) => (a.disparoEm as string).localeCompare(b.disparoEm as string));
}
