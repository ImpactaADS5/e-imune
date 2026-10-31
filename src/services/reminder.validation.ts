export const MAX_ANTECEDENCIA_DIAS = 30;
export const DEFAULTS = { ativo: true, antecedenciaDias: 1, horario: "09:00" } as const;

type Errors = Record<string, string>;
type Body = Record<string, unknown>;

const asBody = (b: unknown): Body => (b && typeof b === "object" ? (b as Body) : {});

function readAntecedencia(v: unknown): number | null {
  const n = typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= MAX_ANTECEDENCIA_DIAS ? n : null;
}

const HORARIO_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Valida só os campos que vieram no corpo; devolve os válidos em `value`. */
function readFields(b: Body, errors: Errors) {
  const value: { ativo?: boolean; antecedenciaDias?: number; horario?: string } = {};

  if (b.ativo !== undefined) {
    if (typeof b.ativo === "boolean") value.ativo = b.ativo;
    else errors.ativo = "Informe se o lembrete está ativo (true ou false).";
  }
  if (b.antecedenciaDias !== undefined) {
    const n = readAntecedencia(b.antecedenciaDias);
    if (n === null) errors.antecedenciaDias = `A antecedência deve ser um número inteiro de 0 a ${MAX_ANTECEDENCIA_DIAS} dias.`;
    else value.antecedenciaDias = n;
  }
  if (b.horario !== undefined) {
    if (typeof b.horario === "string" && HORARIO_RE.test(b.horario)) value.horario = b.horario;
    else errors.horario = "Horário inválido. Use o formato HH:mm (ex.: 09:00).";
  }
  return value;
}

/** POST: vaccineRecordId é obrigatório; o resto assume os valores padrão. */
export function validateReminderCreate(body: unknown) {
  const b = asBody(body);
  const errors: Errors = {};

  const vaccineRecordId = typeof b.vaccineRecordId === "string" ? b.vaccineRecordId.trim() : "";
  if (!vaccineRecordId) errors.vaccineRecordId = "Selecione o registro de vacina.";

  const fields = readFields(b, errors);
  return {
    errors,
    ok: Object.keys(errors).length === 0,
    value: { vaccineRecordId, ...DEFAULTS, ...fields },
  };
}

/** PUT: parcial (o toggle manda só { ativo }). Precisa de pelo menos um campo válido. */
export function validateReminderUpdate(body: unknown) {
  const b = asBody(body);
  const errors: Errors = {};
  const value = readFields(b, errors);
  if (Object.keys(errors).length === 0 && Object.keys(value).length === 0) {
    errors._ = "Informe ao menos um campo para atualizar (ativo, antecedenciaDias ou horario).";
  }
  return { errors, ok: Object.keys(errors).length === 0, value };
}
