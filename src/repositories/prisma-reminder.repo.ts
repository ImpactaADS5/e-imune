import { toISO } from "../lib/dates";
import { prisma } from "./prisma-vaccine-record.repo";
import type { ReminderRepo, ReminderRow } from "./reminder.repository";

const include = {
  vaccineRecord: {
    select: { dose: true, proximaDose: true, vaccine: { select: { nome: true } } },
  },
} as const;

function toRow(r: any): ReminderRow {
  return {
    id: r.id,
    vaccineRecordId: r.vaccineRecordId,
    vaccineNome: r.vaccineRecord.vaccine.nome,
    dose: r.vaccineRecord.dose,
    proximaDose: r.vaccineRecord.proximaDose ? toISO(r.vaccineRecord.proximaDose) : null,
    ativo: r.ativo,
    antecedenciaDias: r.antecedenciaDias,
    horario: r.horario,
    ackedFor: r.ackedFor,
  };
}

export const prismaReminderRepo: ReminderRepo = {
  async listByUser(userId) {
    const rows = await prisma.reminder.findMany({
      where: { userId },
      include,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toRow);
  },

  async findByIdForUser(id, userId) {
    const row = await prisma.reminder.findFirst({ where: { id, userId }, include });
    return row ? toRow(row) : null;
  },

  async findByRecordForUser(vaccineRecordId, userId) {
    const row = await prisma.reminder.findFirst({ where: { vaccineRecordId, userId }, include });
    return row ? toRow(row) : null;
  },

  async findRecordForUser(vaccineRecordId, userId) {
    const rec = await prisma.vaccineRecord.findFirst({
      where: { id: vaccineRecordId, userId },
      select: { id: true, proximaDose: true },
    });
    return rec ? { id: rec.id, proximaDose: rec.proximaDose ? toISO(rec.proximaDose) : null } : null;
  },

  async create(userId, vaccineRecordId, data) {
    const row = await prisma.reminder.create({
      data: { userId, vaccineRecordId, ...data },
      include,
    });
    return toRow(row);
  },

  async updateForUser(id, userId, data) {
    // updateMany com userId no where: só altera se o lembrete for do usuário
    await prisma.reminder.updateMany({ where: { id, userId }, data });
    const row = await prisma.reminder.findFirstOrThrow({ where: { id, userId }, include });
    return toRow(row);
  },

  async deleteForUser(id, userId) {
    const res = await prisma.reminder.deleteMany({ where: { id, userId } });
    return res.count > 0;
  },
};
