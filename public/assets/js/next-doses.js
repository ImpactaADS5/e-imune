/**
 * Tela Próximas Doses (AC2) + acesso aos lembretes (AC3).
 * Usa GET /vaccine-records/next-doses (dias restantes e status calculados no back)
 * e GET /reminders para indicar quais doses já têm lembrete.
 */
const BADGES = {
  OVERDUE: { cls: "late", text: "Atrasada" },
  DUE_SOON: { cls: "soon", text: "Em breve" },
  UPCOMING: { cls: "soon", text: "Em breve" },
  SCHEDULED: { cls: "scheduled", text: "Agendada" },
};

let nextDoses = [];

document.addEventListener("DOMContentLoaded", () => {
  Utils.requireAuth();
  $("#btn-reminders").addEventListener("click", openFirstReminder);
  initNextDoses();
});

async function initNextDoses() {
  const { NEXT_DOSES, REMINDERS } = window.API_CONFIG.ENDPOINTS;
  try {
    const [doses, reminders] = await Promise.all([
      Api.get(NEXT_DOSES),
      Api.get(REMINDERS).catch(() => []),
    ]);
    nextDoses = doses || [];
    const activeByRecord = new Map((reminders || []).filter((m) => m.ativo).map((m) => [m.vaccineRecordId, m]));
    renderDoses(nextDoses, activeByRecord);
  } catch (err) {
    $("#dose-skeleton").hidden = true;
    Utils.toast(err.message || "Não foi possível carregar as próximas doses.", "error");
  }
}

function daysLabel(dias) {
  if (dias < 0) return `Atrasada há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`;
  if (dias === 0) return "É hoje";
  return `${dias === 1 ? "Falta" : "Faltam"} ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

function renderDoses(doses, activeByRecord) {
  const listEl = $("#dose-list");
  const sorted = [...doses].sort((a, b) => a.diasRestantes - b.diasRestantes);

  $("#dose-skeleton").hidden = true;
  listEl.hidden = sorted.length === 0;
  $("#dose-empty").hidden = sorted.length !== 0;

  listEl.innerHTML = sorted
    .map((d) => {
      const badge = BADGES[d.status] || BADGES.SCHEDULED;
      const reminder = activeByRecord.get(d.recordId);
      return `
    <a class="card dose-card" href="reminder.html?recordId=${encodeURIComponent(d.recordId)}" aria-label="Lembrete de ${Utils.escapeHtml(d.vaccineNome)}">
      <div>
        <div class="dose-card__title">${Utils.escapeHtml(d.vaccineNome)} – ${Utils.escapeHtml(d.doseLabel)}</div>
        <div class="dose-card__date">${Utils.formatDateBR(d.dataPrevista)}</div>
        ${reminder ? `<div class="dose-card__reminder">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>
          Lembrete ativo</div>` : ""}
      </div>
      <div class="dose-card__side">
        <span class="status-badge status-badge--${badge.cls}">${badge.text}</span>
        <span class="dose-card__days">${daysLabel(d.diasRestantes)}</span>
      </div>
    </a>`;
    })
    .join("");
}

/** "Configurar lembretes" abre o lembrete da próxima dose que ainda vai acontecer. */
function openFirstReminder() {
  const upcoming = [...nextDoses]
    .filter((d) => d.diasRestantes >= 0)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)[0];
  const target = upcoming || nextDoses[0];
  if (!target) {
    Utils.toast("Informe a data da próxima dose em um registro para criar um lembrete.");
    return;
  }
  window.location.href = `reminder.html?recordId=${encodeURIComponent(target.recordId)}`;
}
