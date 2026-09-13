import { prisma } from "../../lib/prisma";
import { CreateClinicInput } from "../../lib/validation";

export const createClinic = async (data: CreateClinicInput) => {
  return await prisma.clinic.create({ data });
};

export const getAllClinics = async () => {
  return await prisma.clinic.findMany({ orderBy: { nome: "asc" } });
};
