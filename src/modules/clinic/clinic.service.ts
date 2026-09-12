import prisma from "../../lib/prisma";

interface CreateClinicData {
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  latitude: number;
  longitude: number;
  telefone?: string;
  horario?: string;
}

export const createClinic = async (data: CreateClinicData) => {
  return await prisma.clinic.create({ data });
};

export const getAllClinics = async () => {
  return await prisma.clinic.findMany();
};