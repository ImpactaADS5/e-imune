import prisma from "../../lib/prisma";
import { diffDays, toDate, toISO, todayISO } from "../../lib/dates";
import {
  buildSummary,
  calcNextDoses,
  type RecordLite,
  type VaccineLite,
} from "../../services/vaccine-progress.service";

export interface VaccineRecordInput {
  userId: string;
  vaccineId: string;
  dose: string | null;
  dataAplicacao: string;
  proximaDose: string | null;
  lote: string | null;
  local: string | null;
  observacoes: string | null;
}

export class InvalidDoseError extends Error {}

type RecordWithVaccine = {
  id: string;
  userId: string;
  vaccineId: string;
  numeroDose: number;
  dataAplicacao: Date;
  dataProximaDose: Date | null;
  lote: string | null;
  local: string | null;
  observacoes: string | null;
  comprovanteUrl: string | null;
  criadoEm: Date;
  vaccine: {
    id: string;
    nome: string;
    dosesNecessarias: number;
  };
};

function doseLabel(numeroDose: number, dosesNecessarias: number): string {
  if (dosesNecessarias === 1 && numeroDose === 1) return "Dose única";
  if (numeroDose > dosesNecessarias) return "Reforço";
  return `${numeroDose}ª Dose`;
}

function toApiRecord<T extends RecordWithVaccine>(record: T) {
  const proximaDose = record.dataProximaDose ? toISO(record.dataProximaDose) : null;
  return {
    ...record,
    dose: doseLabel(record.numeroDose, record.vaccine.dosesNecessarias),
    dataAplicacao: toISO(record.dataAplicacao),
    dataProximaDose: proximaDose,
    proximaDose,
    observacoes: record.observacoes ?? null,
  };
}

async function resolveDoseNumber(
  userId: string,
  vaccineId: string,
  dose: string | null,
  fallback?: number
): Promise<number> {
  const label = dose?.trim() ?? "";
  const number = label.match(/\d+/)?.[0];
  if (number) return Number(number);
  if (!label) return fallback ?? 1;
  if (/dose\s+única|dose\s+unica/i.test(label)) return 1;

  if (/reforço|reforco/i.test(label)) {
    const vaccine = await prisma.vaccine.findUnique({
      where: { id: vaccineId },
      select: { dosesNecessarias: true },
    });
    if (!vaccine) throw new InvalidDoseError("Vacina não encontrada.");

    const records = await prisma.vaccineRecord.aggregate({
      where: { userId, vaccineId },
      _max: { numeroDose: true },
    });
    return Math.max(records._max.numeroDose ?? 0, vaccine.dosesNecessarias) + 1;
  }

  throw new InvalidDoseError("Informe o número da dose ou use ‘Reforço’.");
}

function toProgressRecord(record: RecordWithVaccine): RecordLite {
  return {
    id: record.id,
    vaccineId: record.vaccineId,
    vaccineNome: record.vaccine.nome,
    dose: doseLabel(record.numeroDose, record.vaccine.dosesNecessarias),
    dataAplicacao: toISO(record.dataAplicacao),
    proximaDose: record.dataProximaDose ? toISO(record.dataProximaDose) : null,
  };
}

async function getSummaryInputs(userId: string) {
  const [vaccines, records] = await Promise.all([
    prisma.vaccine.findMany({
      select: { id: true, nome: true, dosesNecessarias: true },
    }),
    prisma.vaccineRecord.findMany({
      where: { userId },
      include: { vaccine: { select: { id: true, nome: true, dosesNecessarias: true } } },
      orderBy: { dataAplicacao: "desc" },
    }),
  ]);

  const vaccineRows: VaccineLite[] = vaccines.map((vaccine) => ({
    id: vaccine.id,
    nome: vaccine.nome,
    dosesRecomendadas: vaccine.dosesNecessarias,
  }));
  const recordRows = records.map((record) => toProgressRecord(record));

  return { vaccineRows, recordRows };
}

export const createVaccineRecord = async (data: VaccineRecordInput) => {
  const numeroDose = await resolveDoseNumber(data.userId, data.vaccineId, data.dose);
  const record = await prisma.vaccineRecord.create({
    data: {
      userId: data.userId,
      vaccineId: data.vaccineId,
      numeroDose,
      dataAplicacao: toDate(data.dataAplicacao),
      dataProximaDose: data.proximaDose ? toDate(data.proximaDose) : null,
      lote: data.lote,
      local: data.local,
      observacoes: data.observacoes,
    },
    include: { vaccine: { select: { id: true, nome: true, dosesNecessarias: true } } },
  });
  return toApiRecord(record);
};

export const getAllVaccineRecords = async (userId: string) => {
  const records = await prisma.vaccineRecord.findMany({
    where: { userId },
    include: { vaccine: { select: { id: true, nome: true, dosesNecessarias: true } } },
    orderBy: { dataAplicacao: "desc" },
  });
  return records.map(toApiRecord);
};

export const getVaccineRecordById = async (id: string, userId: string) => {
  const record = await prisma.vaccineRecord.findFirst({
    where: { id, userId },
    include: { vaccine: { select: { id: true, nome: true, dosesNecessarias: true } } },
  });
  return record ? toApiRecord(record) : null;
};

export const updateVaccineRecord = async (
  id: string,
  userId: string,
  data: VaccineRecordInput
) => {
  const existing = await prisma.vaccineRecord.findFirst({
    where: { id, userId },
    select: { numeroDose: true },
  });
  if (!existing) return null;

  const numeroDose = await resolveDoseNumber(userId, data.vaccineId, data.dose, existing.numeroDose);
  const result = await prisma.vaccineRecord.updateMany({
    where: { id, userId },
    data: {
      vaccineId: data.vaccineId,
      numeroDose,
      dataAplicacao: toDate(data.dataAplicacao),
      dataProximaDose: data.proximaDose ? toDate(data.proximaDose) : null,
      lote: data.lote,
      local: data.local,
      observacoes: data.observacoes,
    },
  });
  if (result.count === 0) return null;

  const updated = await prisma.vaccineRecord.findFirstOrThrow({
    where: { id, userId },
    include: { vaccine: { select: { id: true, nome: true, dosesNecessarias: true } } },
  });
  return toApiRecord(updated);
};

export const getVaccineRecordSummary = async (userId: string) => {
  const { vaccineRows, recordRows } = await getSummaryInputs(userId);
  return buildSummary(vaccineRows, recordRows, todayISO());
};

export const getNextDoseSummary = async (userId: string) => {
  const { recordRows } = await getSummaryInputs(userId);
  return calcNextDoses(recordRows, todayISO());
};

// URL antiga (/progress/:userId): mesma regra do /summary, só muda o formato da resposta.
export const getVaccinationProgress = async (userId: string) => {
  const { percent, appliedDoses, expectedDoses } = await getVaccineRecordSummary(userId);
  return {
    totalTaken: appliedDoses,
    totalRequired: expectedDoses,
    percentage: percent,
    status: appliedDoses === 0 ? "Nenhuma vacina registrada" : percent >= 100 ? "Completo" : "Em andamento",
  };
};

// URL antiga (/next-doses/:userId): mesmas pendências do /next-doses, no formato de registro.
export const getNextDoses = async (userId: string) => {
  const today = todayISO();
  const records = await prisma.vaccineRecord.findMany({
    where: { userId },
    include: { vaccine: { select: { id: true, nome: true, dosesNecessarias: true } } },
    orderBy: { dataProximaDose: "asc" },
  });
  const pendingIds = new Set(calcNextDoses(records.map(toProgressRecord), today).map((dose) => dose.recordId));

  return records
    .filter((record) => pendingIds.has(record.id))
    .map((record) => ({
      ...toApiRecord(record),
      diasRestantes: record.dataProximaDose ? diffDays(today, toISO(record.dataProximaDose)) : null,
    }));
};

export const deleteVaccineRecord = async (id: string, userId: string) => {
  // Lembretes ligados ao registro ficam com vaccine_record_id nulo (ON DELETE SET NULL).
  const result = await prisma.vaccineRecord.deleteMany({ where: { id, userId } });
  return result.count > 0;
};
