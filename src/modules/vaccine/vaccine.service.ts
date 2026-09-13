import { prisma } from "../../lib/prisma";
import { CreateVaccineInput } from "../../lib/validation";

// Interface para garantir que os dados recebidos estão no formato certo
export const createVaccine = async (data: CreateVaccineInput) => {
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

  return newVaccine;
};

export const getAllVaccines = async () => {
  // O prisma.vaccine.findMany busca todas as vacinas cadastradas
  const vaccines = await prisma.vaccine.findMany({ orderBy: { nome: "asc" } });
  return vaccines;
};

export const deleteVaccine = async (id: string) => prisma.vaccine.delete({ where: { id } });
