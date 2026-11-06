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

import { prisma } from "../../lib/prisma";

// Fórmula de Haversine para calcular distância em Km entre duas coordenadas
function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export const getClinicasProximas = async (userLat: number, userLon: number, raioKm = 10) => {
  const clinicas = await prisma.clinic.findMany();
  
  // Filtra as clínicas dentro do raio e ordena das mais próximas para as mais distantes
  const proximas = clinicas.map(c => ({
    ...c,
    distanciaKm: calcularDistancia(userLat, userLon, Number(c.latitude), Number(c.longitude))
  }))
  .filter(c => c.distanciaKm <= raioKm)
  .sort((a, b) => a.distanciaKm - b.distanciaKm);

  return proximas;
};