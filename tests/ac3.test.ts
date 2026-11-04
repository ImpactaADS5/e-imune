// AC3: lembretes, exclusão de registro, campanhas em destaque e clínicas próximas.
// Integração usa o Postgres do .env; cada execução cria e apaga os próprios dados.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { addDays, todayISO, toDate } from "../src/lib/dates";
import { prisma } from "../src/lib/prisma";
import { pickFeatured, parseLimit } from "../src/services/campaign.service";
import { rankNearby, validateNearbyQuery } from "../src/services/clinic.service";
import { calcDisparoEm, listDue, toReminderView, type ReminderRow } from "../src/services/reminder.service";
import { validateReminderCreate, validateReminderUpdate } from "../src/services/reminder.validation";
import { cleanup, createTestUser, startServer } from "./helpers";

/* ------------------------------------------------------------------ */
/* Regras puras                                                        */
/* ------------------------------------------------------------------ */
const row = (o: Partial<ReminderRow> = {}): ReminderRow => ({
  id: "m1", vaccineRecordId: "r1", vaccineNome: "COVID-19", dose: "1ª Dose",
  proximaDose: "2026-11-20", ativo: true, antecedenciaDias: 2, horario: "08:30", lidoPara: null, ...o,
});

test("calcDisparoEm: próxima dose menos a antecedência, no horário de São Paulo", () => {
  assert.equal(calcDisparoEm("2026-11-20", 2, "08:30"), "2026-11-18T08:30:00-03:00");
  assert.equal(calcDisparoEm("2027-01-01", 1, "09:00"), "2026-12-31T09:00:00-03:00");
});

test("toReminderView: status de cada situação", () => {
  const antes = new Date("2026-11-18T11:00:00Z"); // 08:00 em SP, meia hora antes do disparo
  const depois = new Date("2026-11-18T12:00:00Z"); // 09:00 em SP
  assert.equal(toReminderView(row(), antes).status, "AGENDADO");
  assert.equal(toReminderView(row(), depois).status, "PENDENTE");
  assert.equal(toReminderView(row({ lidoPara: "2026-11-18T08:30:00-03:00" }), depois).status, "LIDO");
  assert.equal(toReminderView(row({ ativo: false }), depois).status, "DESATIVADO");
  assert.equal(toReminderView(row({ proximaDose: null }), depois).status, "SEM_DATA");
  assert.equal(toReminderView(row()).doseLabel, "2ª dose");
  assert.deepEqual(listDue([row(), row({ id: "m2", ativo: false })], depois).map((v) => v.id), ["m1"]);
});

test("validação de lembrete: antecedência de 0 a 30, horário HH:mm, PUT precisa de algum campo", () => {
  const ok = validateReminderCreate({ vaccineRecordId: "r1" });
  assert.deepEqual(ok.value, { vaccineRecordId: "r1", ativo: true, antecedenciaDias: 1, horario: "09:00" });
  const bad = validateReminderCreate({ antecedenciaDias: 31, horario: "9h" });
  assert.ok(bad.errors.vaccineRecordId && bad.errors.antecedenciaDias && bad.errors.horario);
  assert.equal(validateReminderUpdate({}).ok, false);
  assert.deepEqual(validateReminderUpdate({ ativo: false }).value, { ativo: false });
});

test("pickFeatured: só em destaque e em andamento, as que terminam antes primeiro", () => {
  const base = { descricao: "", publicoAlvo: null, imagemUrl: null };
  const list = pickFeatured([
    { ...base, id: "a", titulo: "A", destaque: true, inicio: "2026-11-01", fim: "2026-11-30" },
    { ...base, id: "b", titulo: "B", destaque: true, inicio: "2026-10-01", fim: "2026-11-10" },
    { ...base, id: "c", titulo: "C", destaque: true, inicio: "2026-09-01", fim: "2026-10-01" }, // já acabou
    { ...base, id: "d", titulo: "D", destaque: false, inicio: "2026-11-01", fim: "2026-12-01" },
  ], "2026-11-04");
  assert.deepEqual(list.map((c) => [c.id, c.diasRestantes]), [["b", 6], ["a", 26]]);
  assert.equal(parseLimit("0").error !== undefined, true);
  assert.equal(parseLimit(undefined).limit, 5);
});

test("clínicas próximas: valida parâmetros e ordena por distância dentro do raio", () => {
  assert.ok(validateNearbyQuery({}).errors.lat);
  assert.ok(validateNearbyQuery({ lat: "-23.5", lng: "200" }).errors.lng);
  const query = validateNearbyQuery({ lat: "-23.5505", lng: "-46.6333", raio: "15" }).value!;
  const base = { endereco: "", cidade: "", uf: "SP", cep: "", telefone: null, horario: null };
  const list = rankNearby([
    { ...base, id: "longe", nome: "Campinas", latitude: -22.9056, longitude: -47.0608 },
    { ...base, id: "perto", nome: "Sé", latitude: -23.5503, longitude: -46.6340 },
    { ...base, id: "medio", nome: "Butantã", latitude: -23.5672, longitude: -46.7181 },
  ], query);
  assert.deepEqual(list.map((c) => c.id), ["perto", "medio"]);
  assert.equal(list[0].distanciaKm, 0.1);
});

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */
type TestUser = Awaited<ReturnType<typeof createTestUser>>;

let api: Awaited<ReturnType<typeof startServer>>;
let u1: TestUser;
let u2: TestUser;
let vaccineId: string;
const ids = { futura: "", atrasada: "", semData: "", campanhas: [] as string[], clinicas: [] as string[] };

const call = (method: string, path: string, user?: TestUser, body?: unknown) =>
  fetch(`${api.baseUrl}${path}`, { method, headers: user?.headers, body: body ? JSON.stringify(body) : undefined });

before(async () => {
  api = await startServer();
  [u1, u2] = await Promise.all([createTestUser(), createTestUser()]);
  vaccineId = (await prisma.vaccine.create({ data: { nome: "Vacina Teste AC3", dosesNecessarias: 2, intervaloDias: 30 } })).id;

  const today = todayISO();
  const record = (dataAplicacao: string, proxima: string | null) =>
    prisma.vaccineRecord.create({
      data: {
        userId: u1.id, vaccineId, numeroDose: 1,
        dataAplicacao: toDate(dataAplicacao), dataProximaDose: proxima ? toDate(proxima) : null,
      },
    });
  ids.futura = (await record(addDays(today, -5), addDays(today, 40))).id;
  ids.atrasada = (await record("2020-01-01", "2020-02-01")).id;
  ids.semData = (await record(addDays(today, -1), null)).id;

  const campanha = (titulo: string, destaque: boolean, inicio: number, fim: number) =>
    prisma.campaign.create({
      data: { titulo, descricao: "teste", destaque, publicoAlvo: "Teste", dataInicio: toDate(addDays(today, inicio)), dataFim: toDate(addDays(today, fim)) },
    });
  ids.campanhas = (await Promise.all([
    campanha("Teste AC3 vigente", true, -1, 1),
    campanha("Teste AC3 encerrada", true, -10, -1),
    campanha("Teste AC3 sem destaque", false, -1, 1),
  ])).map((c) => c.id);

  // No meio do Atlântico, longe das clínicas do seed
  const clinica = (nome: string, latitude: number, longitude: number) =>
    prisma.clinic.create({ data: { nome, endereco: "Rua Teste, 1", cidade: "Teste", estado: "SP", cep: "00000000", latitude, longitude } });
  ids.clinicas = (await Promise.all([clinica("Teste AC3 perto", 0.5, -30.5), clinica("Teste AC3 longe", 1.0, -30.5)])).map((c) => c.id);
});

after(async () => {
  await api.close();
  await prisma.campaign.deleteMany({ where: { id: { in: ids.campanhas } } });
  await prisma.clinic.deleteMany({ where: { id: { in: ids.clinicas } } });
  await cleanup([u1.id, u2.id], [vaccineId]);
});

test("lembretes exigem login", async () => {
  assert.equal((await call("GET", "/reminders")).status, 401);
});

test("POST /reminders: cria um por registro, com disparo calculado", async () => {
  const res = await call("POST", "/reminders", u1, { vaccineRecordId: ids.futura, antecedenciaDias: 3, horario: "08:30" });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.status, "AGENDADO");
  assert.equal(body.disparoEm, `${addDays(todayISO(), 37)}T08:30:00-03:00`);
  assert.equal(body.vaccineNome, "Vacina Teste AC3");
  assert.equal(body.doseLabel, "2ª dose");

  assert.equal((await call("POST", "/reminders", u1, { vaccineRecordId: ids.futura })).status, 409);
});

test("POST /reminders: registro sem próxima dose -> 400; registro de outro usuário -> 404", async () => {
  const semData = await call("POST", "/reminders", u1, { vaccineRecordId: ids.semData });
  assert.equal(semData.status, 400);
  assert.ok((await semData.json()).errors.vaccineRecordId);
  assert.equal((await call("POST", "/reminders", u2, { vaccineRecordId: ids.atrasada })).status, 404);
  assert.equal((await call("POST", "/reminders", u1, { vaccineRecordId: ids.atrasada, horario: "25:00" })).status, 400);
});

test("/reminders/due e ack: pendente aparece no sino e some depois de lido", async () => {
  const created = await (await call("POST", "/reminders", u1, { vaccineRecordId: ids.atrasada })).json();
  assert.equal(created.status, "PENDENTE");

  const due = await (await call("GET", "/reminders/due", u1)).json();
  assert.deepEqual(due.map((r: { id: string }) => r.id), [created.id]);

  const acked = await (await call("POST", `/reminders/${created.id}/ack`, u1)).json();
  assert.equal(acked.status, "LIDO");
  assert.equal((await (await call("GET", "/reminders/due", u1)).json()).length, 0);
});

test("PUT /reminders/:id: toggle e antecedência; outro usuário não vê", async () => {
  const [lembrete] = await (await call("GET", "/reminders", u1)).json();
  const off = await (await call("PUT", `/reminders/${lembrete.id}`, u1, { ativo: false })).json();
  assert.equal(off.status, "DESATIVADO");
  const on = await (await call("PUT", `/reminders/${lembrete.id}`, u1, { ativo: true, antecedenciaDias: 0 })).json();
  assert.equal(on.antecedenciaDias, 0);
  assert.equal((await call("PUT", `/reminders/${lembrete.id}`, u1, {})).status, 400);
  assert.equal((await call("GET", `/reminders/${lembrete.id}`, u2)).status, 404);
  assert.equal((await call("PUT", `/reminders/${lembrete.id}`, u2, { ativo: false })).status, 404);
});

test("DELETE /vaccine-records/:id apaga o registro e o lembrete ligado a ele", async () => {
  assert.equal((await call("DELETE", `/vaccine-records/${ids.futura}`, u2)).status, 404);
  const res = await call("DELETE", `/vaccine-records/${ids.futura}`, u1);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { deleted: true, removedReminders: 1 });
  assert.equal(await prisma.reminder.count({ where: { vaccineRecordId: ids.futura } }), 0);

  const semLembrete = await (await call("DELETE", `/vaccine-records/${ids.semData}`, u1)).json();
  assert.equal(semLembrete.removedReminders, 0);
});

test("DELETE /reminders/:id", async () => {
  const [lembrete] = await (await call("GET", "/reminders", u1)).json();
  assert.equal((await call("DELETE", `/reminders/${lembrete.id}`, u1)).status, 204);
  assert.equal((await call("DELETE", `/reminders/${lembrete.id}`, u1)).status, 404);
});

test("GET /campaigns/featured: só em destaque e vigentes, com público-alvo e dias restantes", async () => {
  const res = await call("GET", "/campaigns/featured?limit=10", u1);
  assert.equal(res.status, 200);
  const list = await res.json();
  const nossas = list.filter((c: { id: string }) => ids.campanhas.includes(c.id));
  assert.deepEqual(nossas.map((c: { titulo: string }) => c.titulo), ["Teste AC3 vigente"]);
  assert.equal(nossas[0].publicoAlvo, "Teste");
  assert.equal(nossas[0].diasRestantes, 1);
  assert.equal((await call("GET", "/campaigns/featured?limit=99", u1)).status, 400);
});

test("GET /clinics/nearby: ordena por distância e respeita o raio", async () => {
  const res = await call("GET", "/clinics/nearby?lat=0.5&lng=-30.5&raio=10", u1);
  assert.equal(res.status, 200);
  const list = await res.json();
  assert.deepEqual(list.map((c: { nome: string }) => c.nome), ["Teste AC3 perto"]);
  assert.equal(list[0].uf, "SP");
  assert.equal(list[0].distanciaKm, 0);

  const amplo = await (await call("GET", "/clinics/nearby?lat=0.5&lng=-30.5&raio=100", u1)).json();
  assert.deepEqual(amplo.map((c: { nome: string }) => c.nome), ["Teste AC3 perto", "Teste AC3 longe"]);
  assert.equal((await call("GET", "/clinics/nearby?lng=-30.5", u1)).status, 400);
});
