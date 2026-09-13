import { prisma } from "../../lib/prisma";
import { CreateClinicInput } from "../../lib/validation";
import log, { sanitizeForLog } from "../../lib/log";

export const createClinic = async (data: CreateClinicInput) => {
  log.debug({ data: sanitizeForLog(data) }, "ClinicService.createClinic: iniciando criação da clínica.");
  const clinic = await prisma.clinic.create({ data: { ...data, estado: data.estado.toUpperCase() } });
  log.info({ clinic: sanitizeForLog(clinic) }, "ClinicService.createClinic: clínica criada no banco.");
  return clinic;
};

export const getAllClinics = async () => {
  log.debug({}, "ClinicService.getAllClinics: buscando clínicas cadastradas.");
  const clinics = await prisma.clinic.findMany({ orderBy: { nome: "asc" } });
  log.info({ count: clinics.length, clinics: sanitizeForLog(clinics) }, "ClinicService.getAllClinics: clínicas carregadas.");
  return clinics;
};
