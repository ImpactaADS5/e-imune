/** Utilidades de geolocalização (usadas por "clínicas próximas"). */

const EARTH_RADIUS_KM = 6371;
const KM_PER_DEGREE_LAT = 111.32;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Distância em km entre dois pontos (fórmula de Haversine). */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Retângulo que contém o círculo de raio `raioKm` em volta do ponto.
 * Serve só para reduzir a consulta no banco; a distância exata é conferida
 * depois com haversineKm. Pensado para uso no Brasil (não trata a linha
 * de mudança de data nem os polos).
 */
export function boundingBox(lat: number, lng: number, raioKm: number): BoundingBox {
  const dLat = raioKm / KM_PER_DEGREE_LAT;
  const cos = Math.max(Math.cos(rad(lat)), 0.01);
  const dLng = raioKm / (KM_PER_DEGREE_LAT * cos);
  return {
    minLat: Math.max(-90, lat - dLat),
    maxLat: Math.min(90, lat + dLat),
    minLng: Math.max(-180, lng - dLng),
    maxLng: Math.min(180, lng + dLng),
  };
}
