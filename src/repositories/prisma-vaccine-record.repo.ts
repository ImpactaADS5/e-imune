import { PrismaClient } from "@prisma/client";
import { toDate, toISO } from "../lib/dates";
import type { RecordRow, VaccineRecordRepo } from "./vaccine-record.repository";

export const prisma = new PrismaClient();

const include = { vaccine: { select: { nome: true } } } as const;

function toRow(r: any): RecordRow {
  return {
    id: r.id,
    vaccineId: r.vaccineId,
    vaccineNome: r.vaccine.nome,
    dose: r.dose,
    dataAplicacao: toISO(r.dataAplicacao),
    proximaDose: r.proximaDose ? toISO(r.proximaDose) : null,
    local: r.local,
    lote: r.lote,
    observacoes: r.observacoes,
  };
}

export const prismaVaccineRecordRepo: VaccineRecordRepo = {
  async listByUser(userId) {
    const rows = await prisma.vaccineRecord.findMany({
      where: { userId },
      include,
      orderBy: { dataAplicacao: "desc" },
    });
    return rows.map(toRow);
  },

  async findByIdForUser(id, userId) {
    // findFirst com userId garante que ninguém lê/edita registro de outro usuário
    const row = await prisma.vaccineRecord.findFirst({ where: { id, userId }, include });
    return row ? toRow(row) : null;
  },

  async updateForUser(id, userId, data) {
    // updateMany com userId no where: só atualiza se for do próprio usuário
    await prisma.vaccineRecord.updateMany({
      where: { id, userId },
      data: {
        vaccineId: data.vaccineId,
        dose: data.dose,
        dataAplicacao: toDate(data.dataAplicacao),
        proximaDose: data.proximaDose ? toDate(data.proximaDose) : null,
        local: data.local,
        lote: data.lote,
        observacoes: data.observacoes,
      },
    });
    const row = await prisma.vaccineRecord.findFirstOrThrow({ where: { id, userId }, include });
    return toRow(row);
  },

  async deleteForUser(id, userId) {
    // Transação: ou apaga lembretes + registro, ou não apaga nada.
    // Os lembretes são apagados ANTES porque Reminder.vaccineRecordId é FK para o registro
    // (sem isso o banco recusa o delete com P2003). O onDelete: Cascade do schema é a segunda proteção.
    return prisma.$transaction(async (tx: any) => {
      const owned = await tx.vaccineRecord.findFirst({ where: { id, userId }, select: { id: true } });
      if (!owned) return null;
      const reminders = await tx.reminder.deleteMany({ where: { vaccineRecordId: id } });
      await tx.vaccineRecord.delete({ where: { id } });
      return { removedReminders: reminders.count as number };
    });
  },

  async vaccineExists(vaccineId) {
    return (await prisma.vaccine.count({ where: { id: vaccineId } })) > 0;
  },

  async listVaccines() {
    return prisma.vaccine.findMany({
      select: { id: true, nome: true, dosesRecomendadas: true },
    });
  },
};
