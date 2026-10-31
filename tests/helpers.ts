import jwt from "jsonwebtoken";
import type { RecordRow, VaccineRecordRepo } from "../src/repositories/vaccine-record.repository";
import type { VaccineLite } from "../src/services/vaccine-progress.service";
import type { CampaignRepo, CampaignRow } from "../src/repositories/campaign.repository";
import type { ClinicRepo, ClinicRow } from "../src/repositories/clinic.repository";
import type { ReminderRepo, ReminderRow } from "../src/repositories/reminder.repository";

export interface Stored extends RecordRow { userId: string }

/** Lembrete como fica "gravado" (sem os dados do registro, que vêm por join). */
export interface StoredReminder {
  id: string;
  userId: string;
  vaccineRecordId: string;
  ativo: boolean;
  antecedenciaDias: number;
  horario: string;
  ackedFor: string | null;
}

/** Repositório em memória: mesmo contrato do Prisma, para testar sem banco. */
export function makeFakeRepo(
  vaccines: VaccineLite[],
  rows: Stored[],
  reminders: StoredReminder[] = []
): VaccineRecordRepo & { rows: Stored[] } {
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
    async deleteForUser(id, userId) {
      const i = rows.findIndex((x) => x.id === id && x.userId === userId);
      if (i === -1) return null;
      // mesma regra do Prisma: lembretes do registro saem junto (FK)
      let removedReminders = 0;
      for (let j = reminders.length - 1; j >= 0; j--) {
        if (reminders[j].vaccineRecordId === id) { reminders.splice(j, 1); removedReminders++; }
      }
      rows.splice(i, 1);
      return { removedReminders };
    },
    async vaccineExists(id) { return vaccines.some((v) => v.id === id); },
    async listVaccines() { return vaccines; },
  };
}

export const tokenFor = (userId: string) => jwt.sign({ sub: userId }, "dev-secret");

/** Repositório de lembretes em memória (faz o "join" com os registros como o Prisma faz). */
export function makeFakeReminderRepo(records: Stored[], reminders: StoredReminder[]): ReminderRepo {
  let seq = 0;
  const hydrate = (r: StoredReminder): ReminderRow => {
    const rec = records.find((x) => x.id === r.vaccineRecordId)!;
    return {
      id: r.id, vaccineRecordId: r.vaccineRecordId, vaccineNome: rec.vaccineNome, dose: rec.dose,
      proximaDose: rec.proximaDose, ativo: r.ativo, antecedenciaDias: r.antecedenciaDias,
      horario: r.horario, ackedFor: r.ackedFor,
    };
  };
  const mine = (id: string, userId: string) => reminders.find((r) => r.id === id && r.userId === userId);
  return {
    async listByUser(userId) { return reminders.filter((r) => r.userId === userId).map(hydrate); },
    async findByIdForUser(id, userId) { const r = mine(id, userId); return r ? hydrate(r) : null; },
    async findByRecordForUser(recId, userId) {
      const r = reminders.find((x) => x.vaccineRecordId === recId && x.userId === userId);
      return r ? hydrate(r) : null;
    },
    async findRecordForUser(recId, userId) {
      const rec = records.find((x) => x.id === recId && x.userId === userId);
      return rec ? { id: rec.id, proximaDose: rec.proximaDose } : null;
    },
    async create(userId, vaccineRecordId, data) {
      const r: StoredReminder = { id: `rem${++seq}`, userId, vaccineRecordId, ackedFor: null, ...data };
      reminders.push(r);
      return hydrate(r);
    },
    async updateForUser(id, userId, data) { const r = mine(id, userId)!; Object.assign(r, data); return hydrate(r); },
    async deleteForUser(id, userId) {
      const i = reminders.findIndex((r) => r.id === id && r.userId === userId);
      if (i === -1) return false;
      reminders.splice(i, 1);
      return true;
    },
  };
}

export const makeFakeCampaignRepo = (rows: CampaignRow[]): CampaignRepo => ({
  async listHighlighted(today) { return rows.filter((c) => c.destaque && c.inicio <= today && c.fim >= today); },
});

export const makeFakeClinicRepo = (rows: ClinicRow[]): ClinicRepo => ({
  async listInBox(b) {
    return rows.filter((c) => c.latitude >= b.minLat && c.latitude <= b.maxLat && c.longitude >= b.minLng && c.longitude <= b.maxLng);
  },
});
