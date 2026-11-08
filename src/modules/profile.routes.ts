import { Router, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const defaultPreferences = {
  alertas: true, proximasDoses: true, campanhas: true,
  dicas: false, resumoSemanal: false,
};

const preferencesSchema = z.object({
  alertas: z.boolean().optional(),
  proximasDoses: z.boolean().optional(),
  campanhas: z.boolean().optional(),
  dicas: z.boolean().optional(),
  resumoSemanal: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Informe pelo menos uma preferência.");

function validBirthDate(value: string | null): boolean {
  if (value === null) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10);
}

const profileSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo.").max(120),
  email: z.email("Informe um e-mail válido.").max(254).transform((v) => v.toLowerCase()),
  telefone: z.string().regex(/^\d{10,11}$/, "Telefone inválido.").nullable().optional(),
  dataNascimento: z.string().nullable().optional()
    .refine((value) => value === undefined || validBirthDate(value), "Data de nascimento inválida."),
}).strict();

const passwordSchema = z.object({
  senhaAtual: z.string().min(1, "Informe a senha atual."),
  novaSenha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres.").max(72),
}).strict();

function validationErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "formulario");
    if (!errors[field]) errors[field] = issue.message;
  }
  return { error: "Dados inválidos.", errors };
}

const selectPublic = {
  id: true, nome: true, email: true, cpf: true, telefone: true,
  dataNascimento: true, role: true, twoFactorEnabled: true,
  notificationPreferences: true,
} as const;

function fail(res: Response) {
  return res.status(500).json({ error: "Não foi possível concluir a operação." });
}

router.get("/me", async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId }, select: selectPublic,
    });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    // O segundo fator ainda não é validado no login; nunca informar proteção inexistente.
    return res.json({ ...user, twoFactorEnabled: false });
  } catch { return fail(res); }
});

router.put("/me", async (req: Request, res: Response) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationErrors(parsed.error));
  const { nome, email, telefone, dataNascimento } = parsed.data;
  try {
    const duplicate = await prisma.user.findFirst({
      where: { email, NOT: { id: req.user!.userId } }, select: { id: true },
    });
    if (duplicate) return res.status(409).json({
      error: "Este e-mail já está em uso.", errors: { email: "Este e-mail já está em uso." },
    });
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        nome, email, telefone: telefone ?? null,
        dataNascimento: dataNascimento ? new Date(dataNascimento + "T12:00:00Z") : null,
      },
      select: selectPublic,
    });
    return res.json({ ...user, twoFactorEnabled: false });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return res.status(409).json({
      error: "Este e-mail já está em uso.", errors: { email: "Este e-mail já está em uso." },
    });
    return fail(res);
  }
});

router.put("/me/password", async (req: Request, res: Response) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationErrors(parsed.error));
  const { senhaAtual, novaSenha } = parsed.data;
  if (senhaAtual === novaSenha) return res.status(400).json({
    error: "A nova senha deve ser diferente da atual.",
    errors: { novaSenha: "A nova senha deve ser diferente da atual." },
  });
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId }, select: { passwordHash: true },
    });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    if (!await bcrypt.compare(senhaAtual, user.passwordHash)) return res.status(400).json({
      error: "Senha atual incorreta.", errors: { senhaAtual: "Senha atual incorreta." },
    });
    const passwordHash = await bcrypt.hash(novaSenha, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user!.userId }, data: { passwordHash } }),
      prisma.session.updateMany({
        where: { userId: req.user!.userId, jti: { not: req.user!.jti }, revogadoEm: null },
        data: { revogadoEm: new Date() },
      }),
    ]);
    return res.status(204).send();
  } catch { return fail(res); }
});

router.get("/me/notification-preferences", async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId }, select: { notificationPreferences: true },
    });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    return res.json({ ...defaultPreferences, ...(user.notificationPreferences as object) });
  } catch { return fail(res); }
});

router.put("/me/notification-preferences", async (req: Request, res: Response) => {
  const parsed = preferencesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationErrors(parsed.error));
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId }, select: { notificationPreferences: true },
    });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    const merged = { ...defaultPreferences, ...(user.notificationPreferences as object), ...parsed.data };
    await prisma.user.update({
      where: { id: req.user!.userId }, data: { notificationPreferences: merged },
    });
    return res.json(merged);
  } catch { return fail(res); }
});

router.put("/me/2fa", (_req: Request, res: Response) =>
  res.status(501).json({ error: "Autenticação em duas etapas ainda não está disponível." })
);

router.delete("/me", async (req: Request, res: Response) => {
  const senha = req.body?.senha;
  if (typeof senha !== "string" || !senha) return res.status(400).json({
    error: "Confirme sua senha para excluir a conta.", errors: { senha: "Senha obrigatória." },
  });
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId }, select: { passwordHash: true },
    });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    if (!await bcrypt.compare(senha, user.passwordHash))
      return res.status(403).json({ error: "Senha incorreta. Conta não excluída." });
    await prisma.user.delete({ where: { id: req.user!.userId } });
    return res.status(204).send();
  } catch { return fail(res); }
});

export default router;
