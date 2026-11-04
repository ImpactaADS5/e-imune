import { haversineKm } from "../lib/geo";

/** Clínica no formato da API (`uf` vem da coluna `estado`). */
export interface ClinicRow {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string | null;
  horario: string | null;
  latitude: number;
  longitude: number;
}

export const DEFAULT_RADIUS_KM = 10;
export const MAX_RADIUS_KM = 100;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

export interface NearbyQuery {
  lat: number;
  lng: number;
  raio: number;
  limit: number;
}

export interface NearbyClinic extends ClinicRow {
  /** Distância em km, com 1 casa decimal. */
  distanciaKm: number;
}

/** Converte "" / undefined em undefined e qualquer outra coisa em número (NaN se inválido). */
function num(v: unknown): number | undefined {
  if (v === undefined || v === "") return undefined;
  if (typeof v !== "string" && typeof v !== "number") return NaN;
  return Number(v);
}

/** Valida ?lat=&lng=&raio=&limit= (lat e lng obrigatórios). */
export function validateNearbyQuery(query: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const lat = num(query.lat);
  const lng = num(query.lng);
  const raio = num(query.raio);
  const limit = num(query.limit);

  if (lat === undefined) errors.lat = "Informe a latitude.";
  else if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.lat = "Latitude inválida (de -90 a 90).";

  if (lng === undefined) errors.lng = "Informe a longitude.";
  else if (!Number.isFinite(lng) || lng < -180 || lng > 180) errors.lng = "Longitude inválida (de -180 a 180).";

  if (raio !== undefined && (!Number.isFinite(raio) || raio <= 0 || raio > MAX_RADIUS_KM)) {
    errors.raio = `O raio deve ser maior que 0 e no máximo ${MAX_RADIUS_KM} km.`;
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT)) {
    errors.limit = `O limite deve ser um inteiro de 1 a ${MAX_LIMIT}.`;
  }

  const ok = Object.keys(errors).length === 0;
  return {
    errors,
    ok,
    value: ok
      ? ({ lat: lat as number, lng: lng as number, raio: raio ?? DEFAULT_RADIUS_KM, limit: limit ?? DEFAULT_LIMIT } as NearbyQuery)
      : null,
  };
}

/** Calcula a distância exata, descarta quem está fora do raio e ordena do mais perto ao mais longe. */
export function rankNearby(clinics: ClinicRow[], { lat, lng, raio, limit }: NearbyQuery): NearbyClinic[] {
  return clinics
    .map((c) => ({ ...c, d: haversineKm(lat, lng, c.latitude, c.longitude) }))
    .filter((c) => c.d <= raio)
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map(({ d, ...c }) => ({ ...c, distanciaKm: Math.round(d * 10) / 10 }));
}
