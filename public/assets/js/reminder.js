/**
 * Tela Lembrete (AC3).
 * Abre com ?recordId=<id do registro de vacina>.
 * Usa GET /vaccine-records/next-doses (dados da dose) e o CRUD de /reminders:
 * POST cria (um lembrete por registro), PUT altera toggle/antecedência/horário,
 * DELETE exclui. Cada alteração é salva na hora.
 */
const DEFAULT_ADVANCE = 1;
const DEFAULT_TIME = "09:00";

let recordId = null;
let reminder = null; // ReminderView da API, ou null se ainda não existe
let saving = false;

document.addEventListener("DOMContentLoaded", () => {
  Utils.requireAuth();
  recordId = new URLSearchParams(window.location.search).get("recordId");
  fillTimeOptions();

  $("#reminder-active").addEventListener("change", (e) => save({ ativo: e.target.checked }));
  $("#reminder-advance").addEventListener("change", (e) => save({ antecedenciaDias: Number(e.target.value) }));
  $("#reminder-time").addEventListener("change", (e) => save({ horario: e.target.value }));
  $("#btn-delete-reminder").addEventListener("click", deleteReminder);

  initReminder();
});

/** Horários de 30 em 30 minutos, das 06:00 às 22:00. */
function fillTimeOptions(extra) {
  const select = $("#reminder-time");
  const times = [];
  for (let h = 6; h <= 22; h++) {
    times.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 22) times.push(`${String(h).padStart(2, "0")}:30`);
  }
  if (extra && !times.includes(extra)) times.push(extra);
  times.sort();
  select.innerHTML = times.map((t) => `<option value="${t}">${t}</option>`).join("");
}

async function initReminder() {
  if (!recordId) return showEmpty("Lembrete não encontrado", "Abra o lembrete a partir da tela de Próximas Doses.");

  const { NEXT_DOSES, REMINDERS } = window.API_CONFIG.ENDPOINTS;
  try {
    const [doses, reminders] = await Promise.all([Api.get(NEXT_DOSES), Api.get(REMINDERS)]);
    const dose = (doses || []).find((d) => d.recordId === recordId);
    reminder = (reminders || []).find((m) => m.vaccineRecordId === recordId) || null;

    $("#btn-edit-record").href = `vaccine-record-form.html?id=${encodeURIComponent(recordId)}`;

    const nome = dose?.vaccineNome || reminder?.vaccineNome;
    const doseLabel = dose?.doseLabel || reminder?.doseLabel;
    const dataPrevista = dose?.dataPrevista || reminder?.dataPrevista;

    if (!dataPrevista) {
      // Diferencia "registro sem próxima dose" de "registro que não existe"
      const exists = await Api.get(`${window.API_CONFIG.ENDPOINTS.VACCINE_RECORDS}/${encodeURIComponent(recordId)}`)
        .then(() => true)
        .catch((err) => err.status !== 404);
      if (!exists) return showEmpty("Registro não encontrado", "Este registro de vacina não existe mais ou foi excluído.");

      const action = $("#reminder-empty-action");
      action.href = `vaccine-record-form.html?id=${encodeURIComponent(recordId)}`;
      action.textContent = "Editar registro";
      return showEmpty(
        "Sem data de próxima dose",
        "Informe a data da próxima dose no registro para poder criar um lembrete."
      );
    }

    $("#reminder-title").textContent = [nome, doseLabel].filter(Boolean).join(" – ");
    $("#reminder-date").textContent = Utils.formatDateBR(dataPrevista);
    $("#reminder-skeleton").hidden = true;
    $("#reminder-content").hidden = false;
    applyView();
  } catch (err) {
    $("#reminder-skeleton").hidden = true;
    Utils.toast(err.message || "Não foi possível carregar o lembrete.", "error");
  }
}

function showEmpty(title, text) {
  $("#reminder-skeleton").hidden = true;
  $("#reminder-empty-title").textContent = title;
  $("#reminder-empty-text").textContent = text;
  $("#reminder-empty").hidden = false;
}

/** Sincroniza os controles com o estado atual do lembrete. */
function applyView() {
  const active = reminder ? reminder.ativo : false;
  const advance = reminder ? reminder.antecedenciaDias : DEFAULT_ADVANCE;
  const time = reminder ? reminder.horario : DEFAULT_TIME;

  const advanceSelect = $("#reminder-advance");
  if (![...advanceSelect.options].some((o) => Number(o.value) === advance)) {
    advanceSelect.insertAdjacentHTML("beforeend", `<option value="${advance}">${advance} dias antes</option>`);
  }
  fillTimeOptions(time);

  $("#reminder-active").checked = active;
  advanceSelect.value = String(advance);
  $("#reminder-time").value = time;
  setControlsDisabled(false);
  $("#btn-delete-reminder").hidden = !reminder;
  renderStatus();
}

function setControlsDisabled(disabled) {
  const active = $("#reminder-active").checked;
  $("#reminder-active").disabled = disabled;
  $("#reminder-advance").disabled = disabled || !active;
  $("#reminder-time").disabled = disabled || !active;
  $("#btn-delete-reminder").disabled = disabled;
}

/** "2026-11-05T09:00:00-03:00" -> "05/11/2026 às 09:00" */
function formatDisparo(disparoEm) {
  if (!disparoEm) return "";
  const [date, rest] = disparoEm.split("T");
  return `${Utils.formatDateBR(date)} às ${rest.slice(0, 5)}`;
}

function renderStatus() {
  const el = $("#reminder-status");
  el.classList.remove("reminder-status--alert");
  if (!reminder) {
    el.textContent = "Ative para receber um aviso antes da dose.";
    return;
  }
  const messages = {
    DESATIVADO: "Lembrete desativado. Você não receberá avisos desta dose.",
    SEM_DATA: "O registro não tem mais data de próxima dose.",
    AGENDADO: `Você será avisado em ${formatDisparo(reminder.disparoEm)}.`,
    PENDENTE: `Aviso disparado em ${formatDisparo(reminder.disparoEm)}. Não esqueça da sua dose!`,
    LIDO: "Você já viu o aviso desta dose.",
  };
  el.textContent = messages[reminder.status] || "";
  if (reminder.status === "PENDENTE") el.classList.add("reminder-status--alert");
}

async function save(changes) {
  if (saving) return;

  // Sem lembrete e com o toggle desligado não há o que salvar
  if (!reminder && changes.ativo !== true) {
    setControlsDisabled(false);
    return;
  }

  saving = true;
  setControlsDisabled(true);
  const endpoint = window.API_CONFIG.ENDPOINTS.REMINDERS;

  try {
    if (reminder) {
      reminder = await Api.put(`${endpoint}/${encodeURIComponent(reminder.id)}`, changes);
    } else {
      reminder = await Api.post(endpoint, {
        vaccineRecordId: recordId,
        ativo: true,
        antecedenciaDias: Number($("#reminder-advance").value),
        horario: $("#reminder-time").value,
      });
    }
    Utils.toast(reminder.ativo ? "Lembrete salvo." : "Lembrete desativado.", "success");
  } catch (err) {
    const fieldError = err.data?.errors && Object.values(err.data.errors)[0];
    Utils.toast(fieldError || err.message || "Não foi possível salvar o lembrete.", "error");
  } finally {
    saving = false;
    applyView();
  }
}

async function deleteReminder() {
  if (!reminder) return;
  const confirmed = await Utils.confirmDialog({
    title: "Excluir lembrete?",
    message: "Você deixará de receber avisos desta dose. O registro da vacina continua no histórico.",
    confirmText: "Excluir",
    danger: true,
  });
  if (!confirmed) return;

  setControlsDisabled(true);
  try {
    await Api.del(`${window.API_CONFIG.ENDPOINTS.REMINDERS}/${encodeURIComponent(reminder.id)}`);
    reminder = null;
    Utils.toast("Lembrete excluído.", "success");
  } catch (err) {
    Utils.toast(err.message || "Não foi possível excluir o lembrete.", "error");
  } finally {
    applyView();
  }
}
