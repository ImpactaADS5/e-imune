/**
 * Próximas Doses — conexão com a API.
 *   GET /vaccine-records/next-doses -> [{ recordId, vaccineId, vaccineNome, doseLabel,
 *                                         dataPrevista, diasRestantes, status }]
 * status: OVERDUE | DUE_SOON | UPCOMING | SCHEDULED (badges)
 */
const STATUS_BADGE = {
  OVERDUE: { css: "overdue", text: "Atrasada" },
  DUE_SOON: { css: "due-soon", text: "Esta semana" },
  UPCOMING: { css: "upcoming", text: "Em breve" },
  SCHEDULED: { css: "scheduled", text: "Agendada" },
};

document.addEventListener("DOMContentLoaded", async () => {
  Utils.requireAuth();

  try {
    const doses = (await Api.get(window.API_CONFIG.ENDPOINTS.NEXT_DOSES)) || [];
    renderDoses(doses);
  } catch (err) {
    $("#nd-skeleton").hidden = true;
    Utils.toast(err.message || "Não foi possível carregar as próximas doses.", "error");
  }
});

function renderDoses(doses) {
  $("#nd-skeleton").hidden = true;
  $("#nd-list").hidden = doses.length === 0;
  $("#nd-empty").hidden = doses.length !== 0;
  $("#nd-summary").hidden = doses.length === 0;

  $("#stat-overdue").textContent = doses.filter((d) => d.status === "OVERDUE").length;
  $("#stat-soon").textContent = doses.filter((d) => d.status === "DUE_SOON").length;
  $("#stat-total").textContent = doses.length;

  $("#nd-list").innerHTML = doses
    .map((d) => {
      const badge = STATUS_BADGE[d.status] || STATUS_BADGE.SCHEDULED;
      // Leva para o registro já preenchido com a vacina e a dose esperada
      const registerUrl =
        `vaccine-record-form.html?vaccineId=${encodeURIComponent(d.vaccineId)}` +
        `&dose=${encodeURIComponent(d.doseLabel)}`;
      return `
    <article class="list-item nd-card nd-card--${badge.css}" data-id="${Utils.escapeHtml(d.recordId)}">
      <div class="list-item__icon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2l4 4-9 9-5 1 1-5z"/></svg>
      </div>
      <div class="list-item__body">
        <div class="nd-card__top">
          <div class="list-item__title">${Utils.escapeHtml(d.vaccineNome)} – ${Utils.escapeHtml(d.doseLabel)}</div>
          <span class="badge badge--${badge.css}">${badge.text}</span>
        </div>
        <div class="list-item__meta">Previsto para ${Utils.formatDateBR(d.dataPrevista)}</div>
        <div class="nd-card__days">${Utils.daysLabel(d.diasRestantes)}</div>
        <a class="btn btn-ghost nd-card__cta" href="${registerUrl}">Registrar dose aplicada</a>
      </div>
    </article>`;
    })
    .join("");
}
