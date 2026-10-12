import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app";
import { makeFakeRepo, tokenFor } from "./helpers";

const vaccines = [
  { id: "v1", nome: "Febre Amarela", dosesRecomendadas: 2 },
  { id: "v2", nome: "Hepatite B", dosesRecomendadas: 3 },
];
const base = { local: null, lote: null, observacoes: null };
const mk = () => makeFakeRepo(vaccines, [
  { id: "r1", userId: "u1", vaccineId: "v1", vaccineNome: "Febre Amarela", dose: "1ª Dose",
    dataAplicacao: "2026-01-10", proximaDose: "2099-01-01", ...base },
  { id: "r2", userId: "u2", vaccineId: "v2", vaccineNome: "Hepatite B", dose: null,
    dataAplicacao: "2026-02-01", proximaDose: null, ...base },
]);
const auth = (u: string) => ({ Authorization: `Bearer ${tokenFor(u)}` });

test("sem token -> 401", async () => {
  const res = await request(createApp(mk())).get("/api/vaccine-records/summary");
  assert.equal(res.status, 401);
});

test("GET /summary: progresso do usuário logado (não mistura com outro usuário)", async () => {
  const res = await request(createApp(mk())).get("/api/vaccine-records/summary").set(auth("u1"));
  assert.equal(res.status, 200);
  assert.equal(res.body.percent, 20); // 1 dose de 5 esperadas
  assert.equal(res.body.totalRecords, 1);
  assert.equal(res.body.nextDose.vaccineNome, "Febre Amarela");
  assert.ok(res.body.disclaimer);
});

test("GET /next-doses: devolve diasRestantes e status", async () => {
  const res = await request(createApp(mk())).get("/api/vaccine-records/next-doses").set(auth("u1"));
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].status, "SCHEDULED");
  assert.ok(res.body[0].diasRestantes > 30);
  assert.equal(res.body[0].doseLabel, "2ª dose");
});

test("/summary e /next-doses não são confundidos com /:id", async () => {
  const res = await request(createApp(mk())).get("/api/vaccine-records/summary").set(auth("u1"));
  assert.notEqual(res.status, 404);
});

test("GET /:id: dono vê, outro usuário recebe 404", async () => {
  const app = createApp(mk());
  assert.equal((await request(app).get("/api/vaccine-records/r1").set(auth("u1"))).status, 200);
  assert.equal((await request(app).get("/api/vaccine-records/r1").set(auth("u2"))).status, 404);
});

test("PUT /:id edita registro do próprio usuário", async () => {
  const repo = mk();
  const res = await request(createApp(repo)).put("/api/vaccine-records/r1").set(auth("u1")).send({
    vaccineId: "v2", dose: "2ª Dose", dataAplicacao: "2026-03-01", proximaDose: "2026-09-01",
    local: "UBS Centro", lote: "L1", observacoes: "ok",
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.vaccineNome, "Hepatite B");
  assert.equal(repo.rows[0].local, "UBS Centro");
});

test("PUT com data futura -> 400 com erro no campo", async () => {
  const res = await request(createApp(mk())).put("/api/vaccine-records/r1").set(auth("u1"))
    .send({ vaccineId: "v1", dataAplicacao: "2099-01-01" });
  assert.equal(res.status, 400);
  assert.equal(res.body.errors.dataAplicacao, "A data da aplicação não pode ser futura.");
});

test("PUT com vacina inexistente -> 400; registro de outro usuário -> 404", async () => {
  const app = createApp(mk());
  const a = await request(app).put("/api/vaccine-records/r1").set(auth("u1"))
    .send({ vaccineId: "nope", dataAplicacao: "2026-03-01" });
  assert.equal(a.status, 400);
  assert.equal(a.body.errors.vaccineId, "Vacina não encontrada.");
  const b = await request(app).put("/api/vaccine-records/r1").set(auth("u2"))
    .send({ vaccineId: "v1", dataAplicacao: "2026-03-01" });
  assert.equal(b.status, 404);
});
