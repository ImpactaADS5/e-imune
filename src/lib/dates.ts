/**
 * Datas "só dia" (YYYY-MM-DD), sempre calculadas no fuso de São Paulo.
 * Evita o bug clássico de usar toISOString() (UTC): depois das 21h em SP
 * o "hoje" em UTC já é amanhã e deixaria passar uma data futura.
 */
export const APP_TIMEZONE = "America/Sao_Paulo";

export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Diferença em dias de calendário: (to - from). */
export function diffDays(fromISO: string, toISO: string): number {
  const from = Date.parse(`${fromISO}T00:00:00.000Z`);
  const to = Date.parse(`${toISO}T00:00:00.000Z`);
  return Math.round((to - from) / 86_400_000);
}

export const toDate = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
export const toISO = (d: Date): string => d.toISOString().slice(0, 10);
