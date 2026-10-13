// Testes de integração: usam o Postgres do .env (docker compose up -d + npm run db:setup).
// Cada execução cria os próprios usuários/vacinas e apaga tudo no final.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { prisma } from "../src/lib/prisma";
import { cleanup, createTestUser, startServer } from "./helpers";

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

let api: Awaited<ReturnType<typeof startServer>>;
let u1: TestUser;
let u2: TestUser;
let v1: string;
let v2: string;
let r1: string;

const get = (path: string, user?: TestUser) => fetch(`${api.baseUrl}${path}`, { headers: user?.headers });
const put = (path: string, user: TestUser, body: unknown) =>
  fetch(`${api.baseUrl}${path}`, { method: "PUT", headers: user.headers, body: JSON.stringify(body) });

before(async () => {
  api = await startServer();
  [u1, u2] = await Promise.all([createTestUser(), createTestUser()]);

  const [a, b] = await Promise.all([
    prisma.vaccine.create({ data: { nome: "Vacina Teste A", dosesNecessarias: 2, intervaloDias: 30 } }),
    prisma.vaccine.create({ data: { nome: "Vacina Teste B", dosesNecessarias: 3, intervaloDias: 30 } }),
  ]);
  v1 = a.id;
  v2 = b.id;

  // u1: uma dose agendada (A) e uma atrasada (B). u2 não tem registros.
  const record = await prisma.vaccineRecord.create({
    data: {
      userId: u1.id,
      vaccineId: v1,
      numeroDose: 1,
      dataAplicacao: new Date("2026-01-10T00:00:00.000Z"),
      dataProximaDose: new Date("2099-01-01T00:00:00.000Z"),
    },
  });
  r1 = record.id;
  await prisma.vaccineRecord.create({
    data: {
      userId: u1.id,
      vaccineId: v2,
      numeroDose: 1,
      dataAplicacao: new Date("2020-01-01T00:00:00.000Z"),
      dataProximaDose: new Date("2020-02-01T00:00:00.000Z"),
    },
  });
});

after(async () => {
  await api.close();
  await cleanup([u1.id, u2.id], [v1, v2]);
});

test("sem token -> 401", async () => {
  const res = await get("/vaccine-records/summary");
  assert.equal(res.status, 401);
});

test("GET /summary: progresso do usuário logado (não mistura com outro usuário)", async () => {
  const res = await get("/vaccine-records/summary", u1);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.totalRecords, 2);
  assert.equal(body.overdueCount, 1);
  assert.equal(body.nextDose.vaccineNome, "Vacina Teste B"); // a mais antiga (atrasada) vem primeiro
  assert.ok(body.percent > 0 && body.percent <= 100);
  assert.ok(body.disclaimer);

  const other = await (await get("/vaccine-records/summary", u2)).json();
  assert.equal(other.totalRecords, 0);
  assert.equal(other.percent, 0);
});

test("GET /next-doses: devolve diasRestantes e status, com a atrasada primeiro", async () => {
  const res = await get("/vaccine-records/next-doses", u1);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.map((d: { status: string }) => d.status), ["OVERDUE", "SCHEDULED"]);
  assert.ok(body[0].diasRestantes < 0);
  assert.ok(body[1].diasRestantes > 30);
  assert.equal(body[1].doseLabel, "2ª dose");
});

test("URLs antigas seguem a mesma regra: /next-doses/:userId traz atrasadas e /progress bate com /summary", async () => {
  const doses = await (await get(`/vaccine-records/next-doses/${u1.id}`, u1)).json();
  assert.equal(doses.length, 2);
  assert.ok(doses.some((d: { diasRestantes: number }) => d.diasRestantes < 0));

  const summary = await (await get("/vaccine-records/summary", u1)).json();
  const progress = await (await get(`/vaccine-records/progress/${u1.id}`, u1)).json();
  assert.equal(progress.percentage, summary.percent);
  assert.equal(progress.totalTaken, summary.appliedDoses);
});

test("GET /:id: dono vê, outro usuário recebe 404", async () => {
  assert.equal((await get(`/vaccine-records/${r1}`, u1)).status, 200);
  assert.equal((await get(`/vaccine-records/${r1}`, u2)).status, 404);
});

test("PUT /:id edita registro do próprio usuário", async () => {
  const res = await put(`/vaccine-records/${r1}`, u1, {
    vaccineId: v1, dose: "1ª Dose", dataAplicacao: "2026-03-01", proximaDose: "2099-01-01",
    local: "UBS Centro", lote: "L1", observacoes: "ok",
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.dataAplicacao, "2026-03-01");
  assert.equal(body.observacoes, "ok");

  const saved = await prisma.vaccineRecord.findUniqueOrThrow({ where: { id: r1 } });
  assert.equal(saved.local, "UBS Centro");
  assert.ok(saved.atualizadoEm > saved.criadoEm);
});

test("PUT com data futura -> 400 com erro no campo", async () => {
  const res = await put(`/vaccine-records/${r1}`, u1, { vaccineId: v1, dataAplicacao: "2099-01-01" });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).errors.dataAplicacao, "A data da aplicação não pode ser futura.");
});

test("PUT com vacina inexistente -> 404; registro de outro usuário -> 404", async () => {
  const a = await put(`/vaccine-records/${r1}`, u1, {
    vaccineId: "00000000-0000-4000-8000-000000000000", dataAplicacao: "2026-03-01",
  });
  assert.equal(a.status, 404);
  assert.equal((await a.json()).error, "Vacina não encontrada.");

  const b = await put(`/vaccine-records/${r1}`, u2, { vaccineId: v1, dataAplicacao: "2026-03-01" });
  assert.equal(b.status, 404);
});
