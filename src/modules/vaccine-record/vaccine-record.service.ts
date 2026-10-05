import prisma from "../../lib/prisma";

// 1. Interface (agora exportada para garantir que o TypeScript a encontre)
export interface CreateVaccineRecordData {
  userId: string;
  vaccineId: string;
  numeroDose: number;
  dataAplicacao: string;
  dataProximaDose?: string;
  lote?: string;
  local?: string;
  comprovanteUrl?: string;
}

// 2. Funções da AC1
export const createVaccineRecord = async (data: CreateVaccineRecordData) => {
  return await prisma.vaccineRecord.create({
    data: {
      ...data,
      dataAplicacao: new Date(data.dataAplicacao),
      dataProximaDose: data.dataProximaDose ? new Date(data.dataProximaDose) : null,
    },
  });
};

export const getAllVaccineRecords = async (userId: string) => {
  return await prisma.vaccineRecord.findMany({
    where: { userId }
  });
};

// 3. Funções da AC2
export const updateVaccineRecord = async (id: string, data: Partial<CreateVaccineRecordData>) => {
  const updateData: any = { ...data };
  if (data.dataAplicacao) updateData.dataAplicacao = new Date(data.dataAplicacao);
  if (data.dataProximaDose) updateData.dataProximaDose = new Date(data.dataProximaDose);

  return await prisma.vaccineRecord.update({
    where: { id },
    data: updateData,
  });
};

export const getVaccinationProgress = async (userId: string) => {
  const records = await prisma.vaccineRecord.findMany({
    where: { userId },
    include: { vaccine: true },
  });

  if (records.length === 0) return { totalTaken: 0, totalRequired: 0, percentage: 0, status: "Nenhuma vacina registrada" };

  const progressMap = new Map();
  
  records.forEach((record) => {
    const vid = record.vaccineId;
    if (!progressMap.has(vid)) {
      progressMap.set(vid, { taken: 0, required: record.vaccine.dosesNecessarias });
    }
    const current = progressMap.get(vid);
    if (record.numeroDose > current.taken) {
      current.taken = record.numeroDose;
    }
  });

  let totalRequired = 0;
  let totalTaken = 0;

  progressMap.forEach((val) => {
    totalRequired += val.required;
    totalTaken += val.taken;
  });

  const percentage = Math.round((totalTaken / totalRequired) * 100);

  return {
    totalTaken,
    totalRequired,
    percentage,
    status: percentage >= 100 ? "Completo" : "Em andamento",
  };
};

export const getNextDoses = async (userId: string) => {
  const hoje = new Date();
  
  const records = await prisma.vaccineRecord.findMany({
    where: {
      userId,
      dataProximaDose: { not: null, gte: hoje },
    },
    include: { vaccine: true },
    orderBy: { dataProximaDose: 'asc' },
  });

  return records.map((record) => {
    const diffTime = record.dataProximaDose!.getTime() - hoje.getTime();
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { ...record, diasRestantes };
  });
};