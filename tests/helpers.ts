import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { env } from "../src/config/env";
import { prisma } from "../src/lib/prisma";

/** Sobe o Express em uma porta livre e devolve a URL base da API. */
export async function startServer() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}/api`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/**
 * Usuário descartável com sessão válida, criado direto no banco
 * (não passa pelo /auth/login para não esbarrar no rate limit).
 */
export async function createTestUser() {
  const user = await prisma.user.create({
    data: { email: `teste-${randomUUID()}@eimune.test`, passwordHash: "nao-usado", nome: "Usuário de Teste" },
  });
  const jti = randomUUID();
  await prisma.session.create({
    data: { userId: user.id, jti, expiraEm: new Date(Date.now() + 60 * 60 * 1000) },
  });
  const token = jwt.sign({ email: user.email, role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    jwtid: jti,
    expiresIn: "1h",
  });
  return { id: user.id, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
}

/** Apaga o que o teste criou. Records e sessões caem por cascade no user. */
export async function cleanup(userIds: string[], vaccineIds: string[]) {
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.vaccine.deleteMany({ where: { id: { in: vaccineIds } } });
  await prisma.$disconnect();
}
