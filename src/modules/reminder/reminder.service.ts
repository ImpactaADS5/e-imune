import { prisma } from "../../lib/prisma";
import { CreateReminderInput } from "../../lib/validation";

export const createReminder = async (userId: string, data: CreateReminderInput) => {
  if (data.vaccineRecordId) {
    const record = await prisma.vaccineRecord.findFirst({ where: { id: data.vaccineRecordId, userId } });
    if (!record) {
      const error = new Error("Registro de vacina não encontrado.") as Error & { code?: string };
      error.code = "VACCINE_RECORD_NOT_FOUND";
      throw error;
    }
  }

  return await prisma.reminder.create({
    data: {
      ...data,
      userId,
      agendadoPara: new Date(data.agendadoPara),
    },
  });
};

export const getAllReminders = async (userId: string) => {
  return await prisma.reminder.findMany({
    where: { userId },
    orderBy: { agendadoPara: "asc" },
  });
};
