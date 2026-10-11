import assert from "node:assert/strict";
import { test } from "node:test";
import { diffDays, isValidISODate, todayISO } from "../src/lib/dates";
import {
  calcNextDoses, calcProgress, nextDoseLabel, statusFromDays,
  type RecordLite, type VaccineLite,
} from "../src/services/vaccine-progress.service";
import { validateRecordInput } from "../src/services/vaccine-record.validation";

const vaccines: VaccineLite[] = [
  { id: "v1", nome: "Febre Amarela", dosesRecomendadas: 2 },
  { id: "v2", nome: "Hepatite B", dosesRecomendadas: 3 },
  { id: "v3", nome: "Influenza", dosesRecomendadas: null },
];
const rec = (o: Partial<RecordLite> & { id: string; vaccineId: string }): RecordLite => ({
  vaccineNome: vaccines.find((v) => v.id === o.vaccineId)!.nome,
  dose: null, dataAplicacao: "2026-01-01", proximaDose: null, ...o,
});

test("todayISO usa o fuso de São Paulo (23h SP = 02h UTC do dia seguinte)", () => {
  // 2026-10-11 23:30 em SP == 2026-10-12T02:30Z
  assert.equal(todayISO(new Date("2026-10-12T02:30:00Z")), "2026-10-11");
  assert.equal(todayISO(new Date("2026-10-11T12:00:00Z")), "2026-10-11");
});

test("isValidISODate rejeita datas inexistentes", () => {
  assert.equal(isValidISODate("2026-02-30"), false);
  assert.equal(isValidISODate("2026-13-01"), false);
  assert.equal(isValidISODate("11/10/2026"), false);
  assert.equal(isValidISODate("2026-10-11"), true);
});

test("diffDays conta dias de calendário (inclusive virada de mês/ano)", () => {
  assert.equal(diffDays("2026-10-11", "2026-10-11"), 0);
  assert.equal(diffDays("2026-10-11", "2026-10-26"), 15);
  assert.equal(diffDays("2026-10-11", "2026-10-01"), -10);
  assert.equal(diffDays("2026-12-31", "2027-01-01"), 1);
});

test("calcProgress: sem registros = 0%", () => {
  const p = calcProgress(vaccines, []);
  assert.deepEqual([p.percent, p.appliedDoses, p.expectedDoses], [0, 0, 6]);
  assert.equal(p.message, "Vamos começar!");
});

test("calcProgress: conta doses e limita ao esperado", () => {
  const records = [
    rec({ id: "a", vaccineId: "v1" }), rec({ id: "b", vaccineId: "v1" }),
    rec({ id: "c", vaccineId: "v1" }), // 3º registro de v1 passa do esperado (2): não conta a mais
    rec({ id: "d", vaccineId: "v2" }),
  ];
  const p = calcProgress(vaccines, records);
  assert.equal(p.appliedDoses, 3); // 2 (v1 limitado) + 1 (v2)
  assert.equal(p.percent, 50);     // 3 / 6
  assert.equal(p.message, "Bom progresso!");
});

test("calcProgress: 100% e catálogo vazio", () => {
  const all = [
    rec({ id: "1", vaccineId: "v1" }), rec({ id: "2", vaccineId: "v1" }),
    rec({ id: "3", vaccineId: "v2" }), rec({ id: "4", vaccineId: "v2" }), rec({ id: "5", vaccineId: "v2" }),
    rec({ id: "6", vaccineId: "v3" }),
  ];
  const p = calcProgress(vaccines, all);
  assert.equal(p.percent, 100);
  assert.equal(p.message, "Excelente progresso!");
  assert.equal(calcProgress([], all).percent, 0);
});

test("statusFromDays: limites dos badges", () => {
  assert.equal(statusFromDays(-1), "OVERDUE");
  assert.equal(statusFromDays(0), "DUE_SOON");
  assert.equal(statusFromDays(7), "DUE_SOON");
  assert.equal(statusFromDays(8), "UPCOMING");
  assert.equal(statusFromDays(30), "UPCOMING");
  assert.equal(statusFromDays(31), "SCHEDULED");
});

test("nextDoseLabel", () => {
  assert.equal(nextDoseLabel("1ª Dose"), "2ª dose");
  assert.equal(nextDoseLabel("Dose 2"), "3ª dose");
  assert.equal(nextDoseLabel("Reforço"), "Próxima dose");
  assert.equal(nextDoseLabel(null), "Próxima dose");
});

test("calcNextDoses: ordena, calcula dias e ignora pendência já resolvida", () => {
  const today = "2026-10-11";
  const records = [
    // v1: dose 1 em jan com próxima em out/15 -> pendente (4 dias)
    rec({ id: "r1", vaccineId: "v1", dose: "1ª Dose", dataAplicacao: "2026-01-10", proximaDose: "2026-10-15" }),
    // v2: dose 1 com próxima em set/01 (atrasada), mas depois foi aplicada dose 2 -> resolvida
    rec({ id: "r2", vaccineId: "v2", dose: "1ª Dose", dataAplicacao: "2026-08-01", proximaDose: "2026-09-01" }),
    rec({ id: "r3", vaccineId: "v2", dose: "2ª Dose", dataAplicacao: "2026-09-02", proximaDose: "2027-03-02" }),
    // v3: próxima atrasada em 10 dias
    rec({ id: "r4", vaccineId: "v3", dose: "Dose única", dataAplicacao: "2025-10-01", proximaDose: "2026-10-01" }),
  ];
  const list = calcNextDoses(records, today);
  assert.deepEqual(list.map((d) => [d.recordId, d.diasRestantes, d.status]), [
    ["r4", -10, "OVERDUE"],
    ["r1", 4, "DUE_SOON"],
    ["r3", 142, "SCHEDULED"],
  ]);
  assert.equal(list[1].doseLabel, "2ª dose");
});

test("validação: data futura bloqueada (RN02/RN03), obrigatórios (RN01/RN04)", () => {
  const today = "2026-10-11";
  const empty = validateRecordInput({}, today);
  assert.ok(empty.errors.vaccineId && empty.errors.dataAplicacao);

  const future = validateRecordInput({ vaccineId: "v1", dataAplicacao: "2026-10-12" }, today);
  assert.equal(future.errors.dataAplicacao, "A data da aplicação não pode ser futura.");

  const todayOk = validateRecordInput({ vaccineId: "v1", dataAplicacao: "2026-10-11" }, today);
  assert.equal(todayOk.ok, true);

  const impossible = validateRecordInput({ vaccineId: "v1", dataAplicacao: "2026-02-30" }, today);
  assert.equal(impossible.errors.dataAplicacao, "Data inválida.");
});

test("validação: próxima dose precisa ser depois da aplicação; observações até 200", () => {
  const today = "2026-10-11";
  const bad = validateRecordInput(
    { vaccineId: "v1", dataAplicacao: "2026-10-01", proximaDose: "2026-10-01", observacoes: "x".repeat(201) }, today);
  assert.ok(bad.errors.proximaDose && bad.errors.observacoes);
  const ok = validateRecordInput(
    { vaccineId: "v1", dataAplicacao: "2026-10-01", proximaDose: "2026-12-01", dose: "  1ª Dose ", local: "" }, today);
  assert.equal(ok.ok, true);
  assert.equal(ok.value.dose, "1ª Dose");
  assert.equal(ok.value.local, null);
});
