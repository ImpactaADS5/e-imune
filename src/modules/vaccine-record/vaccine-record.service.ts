import prisma from "../../lib/prisma";

interface CreateVaccineRecordData {
  userId: string;
  vaccineId: string;
  numeroDose: number;
  dataAplicacao: string;
  dataProximaDose?: string;
  lote?: string;
  local?: string;
  comprovanteUrl?: string;
}

export const createVaccineRecord = async (data: CreateVaccineRecordData) => {
  return await prisma.vaccineRecord.create({
    data: {
      ...data,
      dataAplicacao: new Date(data.dataAplicacao),
      dataProximaDose: data.dataProximaDose ? new Date(data.dataProximaDose) : null,
    },
  });
};

export const getAllVaccineRecords = async () => {
  return await prisma.vaccineRecord.findMany();
};