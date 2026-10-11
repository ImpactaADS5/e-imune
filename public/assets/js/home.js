/**
 * Home — conexão com a API (o layout é do front; aqui só buscamos e preenchemos).
 *   GET /vaccine-records/summary -> { percent, message, nextDose, disclaimer, ... }
 */
document.addEventListener("DOMContentLoaded", async () => {
  Utils.requireAuth();

  const user = Api.getUser();
  if (user?.nome) {
    $("#greeting").textContent = `Olá, ${user.nome.split(" ")[0]}! 👋`;
  }

  try {
    const summary = await Api.get(window.API_CONFIG.ENDPOINTS.VACCINE_RECORDS_SUMMARY);
    renderStatus(summary);
    renderNextDose(summary.nextDose);
    renderNotifications(summary.overdueCount);
  } catch (err) {
    $("#status-tag").textContent = "Não foi possível carregar seu status agora.";
    Utils.toast(err.message || "Erro ao carregar o resumo.", "error");
  }
});

function renderStatus(summary) {
  $("#status-ring").style.setProperty("--pct", summary.percent);
  $("#status-pct").textContent = summary.percent;
  $("#status-tag").innerHTML = starIcon() + " " + Utils.escapeHtml(summary.message);
  // Spec Tela 4: o status NÃO é comprovação de calendário oficial
  $("#status-disclaimer").textContent = summary.disclaimer || "";
}

function starIcon() {
  return `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.9-5 4.8 1.3 6.8L12 17.7 5.9 20.8l1.3-6.8-5-4.8 6.9-.9z"/></svg>`;
}

function renderNextDose(next) {
  if (!next) return; // sem dose pendente: o card permanece oculto

  $("#next-dose-card").style.display = "block";
  $("#next-dose-name").textContent = `${next.vaccineNome} – ${next.doseLabel}`;
  $("#next-dose-date").textContent = `${Utils.formatDateBR(next.dataPrevista)} · ${Utils.daysLabel(next.diasRestantes)}`;
}

function renderNotifications(overdueCount) {
  // Badge do sino = doses atrasadas
  const badge = $("#notif-badge");
  if (overdueCount > 0) {
    badge.textContent = overdueCount;
    badge.hidden = false;
  }
}
