/**
 * Tela Próximas Doses (AC2).
 * Usa GET /vaccine-records/next-doses/:userId (dias restantes calculados no back).
 */
const SOON_THRESHOLD_DAYS = 30;

document.addEventListener("DOMContentLoaded", () => {
  Utils.requireAuth();
  initNextDoses();
});

async function initNextDoses() {
  const user = Api.getUser();
  try {
    const [doses, records] = await Promise.all([
      Api.get(`${window.API_CONFIG.ENDPOINTS.VACCINE_RECORDS}/next-doses/${user?.id}`),
      Api.get(window.API_CONFIG.ENDPOINTS.VACCINE_RECORDS),
    ]);

    // Ignora doses que já foram registradas (ex.: aplicada antes da data prevista)
    const applied = new Set((records || []).map((r) => `${r.vaccineId}:${r.numeroDose}`));
    const pending = (doses || []).filter((d) => !applied.has(`${d.vaccineId}:${d.numeroDose + 1}`));
    renderDoses(pending);
  } catch (err) {
    $("#dose-skeleton").hidden = true;
    Utils.toast(err.message || "Não foi possível carregar as próximas doses.", "error");
  }
}

function doseTitle(d) {
  const next = (d.numeroDose || 0) + 1;
  const required = d.vaccine?.dosesNecessarias || 1;
  const label = next > required ? "Reforço" : `Dose ${next}`;
  return `${d.vaccine?.nome || "Vacina"} – ${label}`;
}

function doseBadge(dias) {
  if (dias < 0) return { cls: "late", text: "Atrasada" };
  if (dias <= SOON_THRESHOLD_DAYS) return { cls: "soon", text: "Em breve" };
  return { cls: "scheduled", text: "Agendada" };
}

function daysLabel(dias) {
  if (dias < 0) return `Atrasada há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`;
  if (dias === 0) return "É hoje";
  return `${dias === 1 ? "Falta" : "Faltam"} ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

function renderDoses(doses) {
  const listEl = $("#dose-list");
  const sorted = [...doses].sort((a, b) => a.diasRestantes - b.diasRestantes);

  $("#dose-skeleton").hidden = true;
  listEl.hidden = sorted.length === 0;
  $("#dose-empty").hidden = sorted.length !== 0;

  listEl.innerHTML = sorted
    .map((d) => {
      const badge = doseBadge(d.diasRestantes);
      return `
    <div class="card dose-card">
      <div>
        <div class="dose-card__title">${escapeHtml(doseTitle(d))}</div>
        <div class="dose-card__date">${Utils.formatDateBR(d.dataProximaDose)}</div>
      </div>
      <div class="dose-card__side">
        <span class="status-badge status-badge--${badge.cls}">${badge.text}</span>
        <span class="dose-card__days">${daysLabel(d.diasRestantes)}</span>
      </div>
    </div>`;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
