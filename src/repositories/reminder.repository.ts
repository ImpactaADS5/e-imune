/** Lembrete como vem do banco, já com os dados do registro de vacina ligado a ele. */
export interface ReminderRow {
  id: string;
  vaccineRecordId: string;
  vaccineNome: string;
  dose: string | null;
  /** Próxima dose do REGISTRO (YYYY-MM-DD) ou null se o registro não tem. */
  proximaDose: string | null;
  ativo: boolean;
  antecedenciaDias: number;
  /** "HH:mm" no horário de São Paulo. */
  horario: string;
  /** Data/hora de disparo que o usuário já marcou como lida (ver reminder.service). */
  ackedFor: string | null;
}

export interface ReminderWrite {
  ativo: boolean;
  antecedenciaDias: number;
  horario: string;
}

export interface ReminderRepo {
  listByUser(userId: string): Promise<ReminderRow[]>;
  findByIdForUser(id: string, userId: string): Promise<ReminderRow | null>;
  findByRecordForUser(vaccineRecordId: string, userId: string): Promise<ReminderRow | null>;
  /** Registro do usuário (só os campos que importam para criar o lembrete). */
  findRecordForUser(
    vaccineRecordId: string,
    userId: string
  ): Promise<{ id: string; proximaDose: string | null } | null>;
  create(userId: string, vaccineRecordId: string, data: ReminderWrite): Promise<ReminderRow>;
  updateForUser(
    id: string,
    userId: string,
    data: Partial<ReminderWrite> & { ackedFor?: string | null }
  ): Promise<ReminderRow>;
  deleteForUser(id: string, userId: string): Promise<boolean>;
}
