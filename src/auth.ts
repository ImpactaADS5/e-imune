import { Router, Request, Response } from 'express';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta_eimune';

// Rota de Cadastro
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    const userExists = await prisma.User.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: 'Usuário já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.User.create({
      data: { email, password: hashedPassword, name },
    });

    const { password: _, ...userWithoutPassword } = user;
    return res.status(201).json({ message: 'Cadastrado com sucesso!', user: userWithoutPassword });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Rota de Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.User.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '1d',
    });

    return res.json({ message: 'Login realizado com sucesso!', token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

export default router;