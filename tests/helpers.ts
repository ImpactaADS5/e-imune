import jwt from "jsonwebtoken";
import type { RecordRow, VaccineRecordRepo } from "../src/repositories/vaccine-record.repository";
import type { VaccineLite } from "../src/services/vaccine-progress.service";

interface Stored extends RecordRow { userId: string }

/** Repositório em memória: mesmo contrato do Prisma, para testar sem banco. */
export function makeFakeRepo(vaccines: VaccineLite[], rows: Stored[]): VaccineRecordRepo & { rows: Stored[] } {
  const strip = ({ userId: _u, ...r }: Stored): RecordRow => r;
  return {
    rows,
    async listByUser(userId) { return rows.filter((r) => r.userId === userId).map(strip); },
    async findByIdForUser(id, userId) {
      const r = rows.find((x) => x.id === id && x.userId === userId);
      return r ? strip(r) : null;
    },
    async updateForUser(id, userId, data) {
      const r = rows.find((x) => x.id === id && x.userId === userId)!;
      Object.assign(r, data, { vaccineNome: vaccines.find((v) => v.id === data.vaccineId)!.nome });
      return strip(r);
    },
    async vaccineExists(id) { return vaccines.some((v) => v.id === id); },
    async listVaccines() { return vaccines; },
  };
}

export const tokenFor = (userId: string) => jwt.sign({ sub: userId }, "dev-secret");
