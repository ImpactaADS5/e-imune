import { prisma } from "../../lib/prisma";
import { CreateVaccineRecordInput } from "../../lib/validation";
import log, { sanitizeForLog } from "../../lib/log";

export const createVaccineRecord = async (userId: string, data: CreateVaccineRecordInput) => {
  log.debug({ userId, data: sanitizeForLog(data) }, "VaccineRecordService.create: iniciando criação do registro.");
  const record = await prisma.vaccineRecord.create({
    data: {
      ...data,
      userId,
      dataAplicacao: new Date(data.dataAplicacao),
      dataProximaDose: data.dataProximaDose ? new Date(data.dataProximaDose) : null,
    },
  });
  log.info({ userId, record: sanitizeForLog(record) }, "VaccineRecordService.create: registro criado no banco.");
  return record;
};

export const getAllVaccineRecords = async (userId: string) => {
  log.debug({ userId }, "VaccineRecordService.list: buscando registros do usuário.");
  const records = await prisma.vaccineRecord.findMany({
    where: { userId },
    include: { vaccine: { select: { id: true, nome: true, dosesNecessarias: true } } },
    orderBy: { dataAplicacao: "desc" },
  });

  const response = records.map((record) => ({
    ...record,
    dataAplicacao: record.dataAplicacao.toISOString().slice(0, 10),
    dataProximaDose: record.dataProximaDose?.toISOString().slice(0, 10) ?? null,
    vaccineNome: record.vaccine.nome,
  }));
  log.info({ userId, count: response.length, records: sanitizeForLog(response) }, "VaccineRecordService.list: registros carregados.");
  return response;
};
