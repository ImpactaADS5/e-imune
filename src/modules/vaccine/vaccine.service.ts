import { prisma } from "../../lib/prisma";
import { CreateVaccineInput } from "../../lib/validation";
import log, { describeError, sanitizeForLog } from "../../lib/log";

// Interface para garantir que os dados recebidos estão no formato certo
export const createVaccine = async (data: CreateVaccineInput) => {
  log.debug({ data: sanitizeForLog(data) }, "VaccineService.createVaccine: iniciando criação da vacina.");
  // O prisma.vaccine.create vai inserir os dados reais no banco
  const newVaccine = await prisma.vaccine.create({
    data: {
      nome: data.nome,
      fabricante: data.fabricante,
      dosesNecessarias: data.dosesNecessarias,
      intervaloDias: data.intervaloDias,
      descricao: data.descricao,
    },
  });

  log.info({ vaccine: sanitizeForLog(newVaccine) }, "VaccineService.createVaccine: vacina criada no banco.");
  return newVaccine;
};

export const getAllVaccines = async () => {
  log.debug({}, "VaccineService.getAllVaccines: buscando catálogo de vacinas.");
  // O prisma.vaccine.findMany busca todas as vacinas cadastradas
  const vaccines = await prisma.vaccine.findMany({ orderBy: { nome: "asc" } });
  log.info({ count: vaccines.length, vaccines: sanitizeForLog(vaccines) }, "VaccineService.getAllVaccines: catálogo carregado.");
  return vaccines;
};

export const deleteVaccine = async (id: string) => {
  log.debug({ id }, "VaccineService.deleteVaccine: iniciando remoção da vacina.");
  try {
    const deleted = await prisma.vaccine.delete({ where: { id } });
    log.info({ vaccine: sanitizeForLog(deleted) }, "VaccineService.deleteVaccine: vacina removida do banco.");
    return deleted;
  } catch (error) {
    log.error({ id, error: describeError(error) }, "VaccineService.deleteVaccine: erro ao remover vacina.");
    throw error;
  }
};
