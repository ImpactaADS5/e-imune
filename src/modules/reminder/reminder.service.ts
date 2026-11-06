import { prisma } from "../../lib/prisma";
import { toISO } from "../../lib/dates";
import log from "../../lib/log";
import { listDue, toReminderView, type ReminderRow } from "../../services/reminder.service";

export interface ReminderFields {
  ativo?: boolean;
  antecedenciaDias?: number;
  horario?: string;
}

const include = {
  vaccineRecord: {
    select: { numeroDose: true, dataProximaDose: true, vaccine: { select: { nome: true } } },
  },
} as const;

type ReminderWithRecord = {
  id: string;
  vaccineRecordId: string;
  ativo: boolean;
  antecedenciaDias: number;
  horario: string;
  lidoPara: string | null;
  vaccineRecord: { numeroDose: number; dataProximaDose: Date | null; vaccine: { nome: string } };
};

function toRow(reminder: ReminderWithRecord): ReminderRow {
  return {
    id: reminder.id,
    vaccineRecordId: reminder.vaccineRecordId,
    vaccineNome: reminder.vaccineRecord.vaccine.nome,
    dose: `${reminder.vaccineRecord.numeroDose}ª Dose`,
    proximaDose: reminder.vaccineRecord.dataProximaDose ? toISO(reminder.vaccineRecord.dataProximaDose) : null,
    ativo: reminder.ativo,
    antecedenciaDias: reminder.antecedenciaDias,
    horario: reminder.horario,
    lidoPara: reminder.lidoPara,
  };
}

async function findRow(id: string, userId: string) {
  const reminder = await prisma.reminder.findFirst({ where: { id, userId }, include });
  return reminder ? toRow(reminder) : null;
}

export class ReminderError extends Error {
  status: number;
  field?: string;

  constructor(message: string, status: number, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export const listReminders = async (userId: string) => {
  const reminders = await prisma.reminder.findMany({ where: { userId }, include, orderBy: { criadoEm: "asc" } });
  log.debug({ userId, count: reminders.length }, "ReminderService.listReminders: lembretes carregados.");
  return reminders.map((reminder) => toReminderView(toRow(reminder)));
};

export const listDueReminders = async (userId: string) => {
  const reminders = await prisma.reminder.findMany({ where: { userId }, include });
  return listDue(reminders.map(toRow));
};

export const getReminder = async (id: string, userId: string) => {
  const row = await findRow(id, userId);
  return row ? toReminderView(row) : null;
};

export const createReminder = async (userId: string, vaccineRecordId: string, fields: Required<ReminderFields>) => {
  const record = await prisma.vaccineRecord.findFirst({
    where: { id: vaccineRecordId, userId },
    select: { dataProximaDose: true, reminder: { select: { id: true } } },
  });
  if (!record) throw new ReminderError("Registro de vacina não encontrado.", 404);
  if (!record.dataProximaDose) {
    throw new ReminderError(
      "Este registro não tem data de próxima dose. Edite o registro e informe a data.",
      400,
      "vaccineRecordId"
    );
  }
  if (record.reminder) throw new ReminderError("Já existe um lembrete para este registro.", 409);

  try {
    const reminder = await prisma.reminder.create({ data: { userId, vaccineRecordId, ...fields }, include });
    log.info({ userId, reminderId: reminder.id, vaccineRecordId }, "ReminderService.createReminder: lembrete criado.");
    return toReminderView(toRow(reminder));
  } catch (error) {
    // Dois POST ao mesmo tempo para o mesmo registro esbarram no índice único
    if ((error as { code?: string }).code === "P2002") {
      throw new ReminderError("Já existe um lembrete para este registro.", 409);
    }
    throw error;
  }
};

export const updateReminder = async (id: string, userId: string, data: ReminderFields & { lidoPara?: string }) => {
  const result = await prisma.reminder.updateMany({ where: { id, userId }, data });
  if (result.count === 0) return null;
  return getReminder(id, userId);
};

/** O usuário viu o aviso: some de /due até o disparo mudar (nova data ou nova antecedência). */
export const ackReminder = async (id: string, userId: string) => {
  const current = await getReminder(id, userId);
  if (!current) return null;
  if (!current.disparoEm) throw new ReminderError("Este lembrete não tem data de disparo.", 400);
  return updateReminder(id, userId, { lidoPara: current.disparoEm });
};

export const deleteReminder = async (id: string, userId: string) => {
  const result = await prisma.reminder.deleteMany({ where: { id, userId } });
  return result.count > 0;
};
