import prisma from "../../lib/prisma";

// Interface para garantir que os dados recebidos estão no formato certo
interface CreateVaccineData {
  nome: string;
  fabricante?: string;
  dosesNecessarias: number;
  intervaloDias: number;
  descricao?: string;
}

export const createVaccine = async (data: CreateVaccineData) => {
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
  const vaccines = await prisma.vaccine.findMany();
  return vaccines;
};