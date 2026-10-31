import type { BoundingBox } from "../lib/geo";

export interface ClinicRow {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  uf: string;
  telefone: string | null;
  latitude: number;
  longitude: number;
}

export interface ClinicRepo {
  /** Clínicas dentro do retângulo (pré-filtro; a distância exata é calculada no service). */
  listInBox(box: BoundingBox): Promise<ClinicRow[]>;
}
