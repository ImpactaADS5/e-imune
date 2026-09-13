import { randomUUID } from "crypto";
import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { requireAuth } from "./middleware/auth";
import { loginSchema, registerSchema } from "./lib/validation";

const router = Router();

function publicUser(user: {
  id: string;
  email: string;
  nome: string;
  role: string;
  cpf: string | null;
  telefone: string | null;
  dataNascimento: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    nome: user.nome,
    role: user.role,
    cpf: user.cpf,
    telefone: user.telefone,
    dataNascimento: user.dataNascimento,
  };
}

// Rota de Cadastro
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
    const { email: rawEmail, senha, nome, dataNascimento } = parsed.data;
    const email = rawEmail.toLowerCase();

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(409).json({ error: 'Usuário já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(senha, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        nome,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
      },
    });

    return res.status(201).json({ message: 'Cadastrado com sucesso!', user: publicUser(user) });
  } catch (error) {
    console.error(error);
    if ((error as { code?: string }).code === 'P2002') {
      return res.status(409).json({ error: 'Usuário já cadastrado.' });
    }
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Rota de Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
    const { email: rawEmail, senha } = parsed.data;
    const email = rawEmail.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const passwordMatch = await bcrypt.compare(senha, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const jti = randomUUID();
    const token = jwt.sign({ email: user.email, role: user.role }, env.JWT_SECRET, {
      subject: user.id,
      jwtid: jti,
      expiresIn: '1d',
    });

    await prisma.session.create({
      data: {
        userId: user.id,
        jti,
        userAgent: req.get('user-agent'),
        ip: req.ip,
        expiraEm: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    return res.json({ message: 'Login realizado com sucesso!', token, user: publicUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, nome: true, role: true, cpf: true, telefone: true, dataNascimento: true },
  });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  return res.json(user);
});

router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  await prisma.session.updateMany({ where: { jti: req.user!.jti }, data: { revogadoEm: new Date() } });
  return res.status(204).send();
});

export default router;
