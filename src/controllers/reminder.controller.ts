import type { Request, Response } from "express";
import type { ReminderRepo } from "../repositories/reminder.repository";
import { listDue, toReminderView } from "../services/reminder.service";
import { validateReminderCreate, validateReminderUpdate } from "../services/reminder.validation";

const idParam = (req: Request) => String(req.params.id);
const NOT_FOUND = { message: "Lembrete não encontrado." };

// Violação de índice único do Prisma (dois POST ao mesmo tempo para o mesmo registro)
const isUniqueViolation = (e: unknown) => (e as { code?: string } | null)?.code === "P2002";

const invalid = (res: Response, errors: Record<string, string>) =>
  res.status(400).json({ message: errors._ ?? "Dados inválidos.", errors });

export function createReminderController(repo: ReminderRepo, now: () => Date = () => new Date()) {
  return {
    /** GET /reminders — todos os lembretes do usuário, com disparo e status calculados */
    async list(req: Request, res: Response) {
      const rows = await repo.listByUser(req.userId!);
      res.json(rows.map((r) => toReminderView(r, now())));
    },

    /** GET /reminders/due — o que já deveria ter avisado e ainda não foi visto (sino da Home) */
    async due(req: Request, res: Response) {
      const rows = await repo.listByUser(req.userId!);
      res.json(listDue(rows, now()));
    },

    /** GET /reminders/:id */
    async getById(req: Request, res: Response) {
      const row = await repo.findByIdForUser(idParam(req), req.userId!);
      if (!row) return res.status(404).json(NOT_FOUND);
      res.json(toReminderView(row, now()));
    },

    /** POST /reminders — cria o lembrete de um registro (um por registro) */
    async create(req: Request, res: Response) {
      const { errors, ok, value } = validateReminderCreate(req.body);
      if (!ok) return invalid(res, errors);

      const { vaccineRecordId, ...fields } = value;
      const record = await repo.findRecordForUser(vaccineRecordId, req.userId!);
      if (!record) return res.status(404).json({ message: "Registro não encontrado." });
      if (!record.proximaDose) {
        return invalid(res, {
          vaccineRecordId: "Este registro não tem data de próxima dose. Edite o registro e informe a data.",
        });
      }
      if (await repo.findByRecordForUser(vaccineRecordId, req.userId!)) {
        return res.status(409).json({ message: "Já existe um lembrete para este registro." });
      }

      try {
        const created = await repo.create(req.userId!, vaccineRecordId, fields);
        res.status(201).json(toReminderView(created, now()));
      } catch (e) {
        if (isUniqueViolation(e)) {
          return res.status(409).json({ message: "Já existe um lembrete para este registro." });
        }
        throw e;
      }
    },

    /** PUT /reminders/:id — toggle e/ou antecedência e horário (campos parciais) */
    async update(req: Request, res: Response) {
      const id = idParam(req);
      const existing = await repo.findByIdForUser(id, req.userId!);
      if (!existing) return res.status(404).json(NOT_FOUND);

      const { errors, ok, value } = validateReminderUpdate(req.body);
      if (!ok) return invalid(res, errors);

      const updated = await repo.updateForUser(id, req.userId!, value);
      res.json(toReminderView(updated, now()));
    },

    /** POST /reminders/:id/ack — usuário viu o aviso; some de /due até o próximo disparo mudar */
    async ack(req: Request, res: Response) {
      const id = idParam(req);
      const existing = await repo.findByIdForUser(id, req.userId!);
      if (!existing) return res.status(404).json(NOT_FOUND);

      const view = toReminderView(existing, now());
      if (!view.disparoEm) {
        return res.status(400).json({ message: "Este lembrete não tem data de disparo." });
      }
      const updated = await repo.updateForUser(id, req.userId!, { ackedFor: view.disparoEm });
      res.json(toReminderView(updated, now()));
    },

    /** DELETE /reminders/:id */
    async remove(req: Request, res: Response) {
      const ok = await repo.deleteForUser(idParam(req), req.userId!);
      if (!ok) return res.status(404).json(NOT_FOUND);
      res.status(204).end();
    },
  };
}
