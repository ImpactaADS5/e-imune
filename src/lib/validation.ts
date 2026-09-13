import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).nullish();
const dateText = z.string().min(1).refine((value) => !Number.isNaN(Date.parse(value)), "Data inválida");

export const registerSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  senha: z.string().min(6).max(72),
  dataNascimento: dateText.optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  senha: z.string().min(1).max(72),
});

export const vaccineSchema = z.object({
  nome: z.string().trim().min(1).max(160),
  fabricante: optionalText(160),
  dosesNecessarias: z.coerce.number().int().min(1).max(20),
  intervaloDias: z.coerce.number().int().min(0).max(3650),
  descricao: optionalText(1000),
});

export const vaccineRecordSchema = z.object({
  vaccineId: z.string().uuid(),
  numeroDose: z.coerce.number().int().min(1).max(20),
  dataAplicacao: dateText,
  dataProximaDose: dateText.optional().nullable(),
  lote: optionalText(100),
  local: optionalText(200),
  comprovanteUrl: z.string().url().max(2048).nullish(),
});

export const reminderSchema = z.object({
  vaccineRecordId: z.string().uuid().optional().nullable(),
  titulo: z.string().trim().min(1).max(160),
  descricao: optionalText(1000),
  agendadoPara: dateText,
  antecedenciaHoras: z.coerce.number().int().min(0).max(8760).optional(),
  canal: z.enum(["push", "email", "whatsapp"]).optional(),
  status: z.enum(["pending", "sent", "cancelled"]).optional(),
});

export const campaignSchema = z.object({
  titulo: z.string().trim().min(1).max(200),
  descricao: z.string().trim().min(1).max(2000),
  destaque: z.boolean().optional(),
  dataInicio: dateText,
  dataFim: dateText,
  imagemUrl: z.string().url().max(2048).nullish(),
});

export const clinicSchema = z.object({
  nome: z.string().trim().min(1).max(200),
  endereco: z.string().trim().min(1).max(300),
  cidade: z.string().trim().min(1).max(120),
  estado: z.string().trim().regex(/^[A-Za-z]{2}$/),
  cep: z.string().trim().min(8).max(9),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  telefone: optionalText(30),
  horario: optionalText(120),
});

export type CreateVaccineInput = z.infer<typeof vaccineSchema>;
export type CreateVaccineRecordInput = z.infer<typeof vaccineRecordSchema>;
export type CreateReminderInput = z.infer<typeof reminderSchema>;
export type CreateCampaignInput = z.infer<typeof campaignSchema>;
export type CreateClinicInput = z.infer<typeof clinicSchema>;
