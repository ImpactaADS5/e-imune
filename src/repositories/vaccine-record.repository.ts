import type { RecordLite, VaccineLite } from "../services/vaccine-progress.service";
import type { RecordInput } from "../services/vaccine-record.validation";

/** Registro como a API devolve ao front (datas "YYYY-MM-DD"). */
export interface RecordRow extends RecordLite {
  local: string | null;
  lote: string | null;
  observacoes: string | null;
}

/** Contrato de acesso a dados. Implementação real: prisma-vaccine-record.repo.ts */
export interface VaccineRecordRepo {
  listByUser(userId: string): Promise<RecordRow[]>;
  findByIdForUser(id: string, userId: string): Promise<RecordRow | null>;
  updateForUser(id: string, userId: string, data: RecordInput): Promise<RecordRow>;
  vaccineExists(vaccineId: string): Promise<boolean>;
  listVaccines(): Promise<VaccineLite[]>;
}
