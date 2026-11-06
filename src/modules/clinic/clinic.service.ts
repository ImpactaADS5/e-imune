import { prisma } from "../../lib/prisma";
import { CreateClinicInput } from "../../lib/validation";
import log, { sanitizeForLog } from "../../lib/log";
import { boundingBox } from "../../lib/geo";
import { rankNearby, type NearbyQuery } from "../../services/clinic.service";

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

/** Pré-filtra por retângulo no banco e confere a distância exata (Haversine) em memória. */
export const getNearbyClinics = async (query: NearbyQuery) => {
  const box = boundingBox(query.lat, query.lng, query.raio);
  const clinics = await prisma.clinic.findMany({
    where: {
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLng, lte: box.maxLng },
    },
  });
  const rows = clinics.map((clinic) => ({
    id: clinic.id,
    nome: clinic.nome,
    endereco: clinic.endereco,
    cidade: clinic.cidade,
    uf: clinic.estado,
    cep: clinic.cep,
    telefone: clinic.telefone,
    horario: clinic.horario,
    latitude: clinic.latitude,
    longitude: clinic.longitude,
  }));
  return rankNearby(rows, query);
};
