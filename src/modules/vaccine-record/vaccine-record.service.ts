import { prisma } from "../../lib/prisma";
import { CreateVaccineRecordInput } from "../../lib/validation";

export const createVaccineRecord = async (userId: string, data: CreateVaccineRecordInput) => {
  return await prisma.vaccineRecord.create({
    data: {
      ...data,
      userId,
      dataAplicacao: new Date(data.dataAplicacao),
      dataProximaDose: data.dataProximaDose ? new Date(data.dataProximaDose) : null,
    },
  });
};

export const getAllVaccineRecords = async (userId: string) => {
  const records = await prisma.vaccineRecord.findMany({
    where: { userId },
    include: { vaccine: { select: { id: true, nome: true, dosesNecessarias: true } } },
    orderBy: { dataAplicacao: "desc" },
  });

  return records.map((record) => ({
    ...record,
    dataAplicacao: record.dataAplicacao.toISOString().slice(0, 10),
    dataProximaDose: record.dataProximaDose?.toISOString().slice(0, 10) ?? null,
    vaccineNome: record.vaccine.nome,
  }));
};
