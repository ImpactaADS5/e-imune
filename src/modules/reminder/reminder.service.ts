import prisma from "../../lib/prisma";

interface CreateReminderData {
  userId: string;
  vaccineRecordId?: string;
  titulo: string;
  descricao?: string;
  agendadoPara: string;
  antecedenciaHoras?: number;
  canal?: string;
  status?: string;
}

export const createReminder = async (data: CreateReminderData) => {
  return await prisma.reminder.create({
    data: {
      ...data,
      agendadoPara: new Date(data.agendadoPara),
    },
  });
};

export const getAllReminders = async () => {
  return await prisma.reminder.findMany();
};