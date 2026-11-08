import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { prisma } from "../src/lib/prisma";
import { startServer, createTestUser, cleanup } from "./helpers";

let server: Awaited<ReturnType<typeof startServer>>;
let user: Awaited<ReturnType<typeof createTestUser>>;
let other: Awaited<ReturnType<typeof createTestUser>>;

function call(method: string, path: string, data?: unknown, asUser = true) {
  return fetch(server.baseUrl + path, {
    method,
    headers: asUser ? user.headers : undefined,
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}

before(async () => {
  server = await startServer();
  user = await createTestUser();
  other = await createTestUser();
});
after(async () => {
  if (server) await server.close();
  await cleanup([user.id, other.id], []);
});

test("perfil exige autenticação e não expõe segredos", async () => {
  assert.equal((await call("GET", "/users/me", undefined, false)).status, 401);
  const result = await call("GET", "/users/me");
  assert.equal(result.status, 200);
  const data = await result.json();
  assert.equal(data.id, user.id);
  assert.equal(data.twoFactorEnabled, false);
  assert.equal(data.passwordHash, undefined);
});

test("atualizar dados valida campos e não aceita e-mail de outra conta", async () => {
  const invalid = await call("PUT", "/users/me", {
    nome: "A", email: "errado", telefone: "123", dataNascimento: "2026-02-30",
  });
  assert.equal(invalid.status, 400);
  const errors = (await invalid.json()).errors;
  assert.ok(errors.nome && errors.email && errors.telefone && errors.dataNascimento);
  const collision = (await prisma.user.findUniqueOrThrow({where:{id:other.id}})).email;
  assert.equal((await call("PUT", "/users/me", {
    nome: "Pessoa Teste", email: collision, telefone: null, dataNascimento: null,
  })).status, 409);
  const changed = await call("PUT", "/users/me", {
    nome: "Pessoa Revisada", email: "revisada-ac3@eimune.test",
    telefone: "71999998888", dataNascimento: "1999-12-31",
  });
  assert.equal(changed.status, 200);
  assert.equal((await changed.json()).nome, "Pessoa Revisada");
});

test("preferências fazem atualização parcial persistente", async () => {
  const previous = await (await call("GET", "/users/me/notification-preferences")).json();
  assert.equal(typeof previous.alertas, "boolean");
  assert.equal((await call("PUT", "/users/me/notification-preferences", {extra:true})).status, 400);
  const modified = await call("PUT", "/users/me/notification-preferences", {dicas:true});
  assert.equal(modified.status, 200);
  const prefs = await (await call("GET", "/users/me/notification-preferences")).json();
  assert.equal(prefs.dicas, true);
  assert.equal(prefs.alertas, previous.alertas);
});

test("sessões e segundo fator sinalizam seu estado real", async () => {
  const sessions = await call("GET", "/auth/sessions");
  assert.equal(sessions.status, 200);
  const list = await sessions.json();
  assert.ok(list.length >= 1);
  assert.ok(list.some((s: { atual:boolean }) => s.atual));
  assert.equal((await call("DELETE", "/auth/sessions/" + list[0].id)).status, 400);
  assert.equal((await call("PUT", "/users/me/2fa", {enabled:true})).status, 501);
});
