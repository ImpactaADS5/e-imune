import { prisma } from "../../lib/prisma";
import { CreateReminderInput } from "../../lib/validation";
import log, { sanitizeForLog } from "../../lib/log";

export const createReminder = async (userId: string, data: CreateReminderInput) => {
  log.debug({ userId, data: sanitizeForLog(data) }, "ReminderService.createReminder: iniciando criação do lembrete.");
  if (data.vaccineRecordId) {
    const record = await prisma.vaccineRecord.findFirst({ where: { id: data.vaccineRecordId, userId } });
    if (!record) {
      const error = new Error("Registro de vacina não encontrado.") as Error & { code?: string };
      error.code = "VACCINE_RECORD_NOT_FOUND";
      log.warn({ userId, vaccineRecordId: data.vaccineRecordId }, "ReminderService.createReminder: registro não pertence ao usuário.");
      throw error;
    }
  }

  const reminder = await prisma.reminder.create({
    data: {
      ...data,
      userId,
      agendadoPara: new Date(data.agendadoPara),
    },
  });
  log.info({ reminder: sanitizeForLog(reminder) }, "ReminderService.createReminder: lembrete criado no banco.");
  return reminder;
};

export const getAllReminders = async (userId: string) => {
  log.debug({ userId }, "ReminderService.getAllReminders: buscando lembretes do usuário.");
  const reminders = await prisma.reminder.findMany({
    where: { userId },
    orderBy: { agendadoPara: "asc" },
  });
  log.info({ userId, count: reminders.length, reminders: sanitizeForLog(reminders) }, "ReminderService.getAllReminders: lembretes carregados.");
  return reminders;
};
