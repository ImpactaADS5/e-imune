/**
 * Registrar / Editar vacina (Tela 5) + Histórico de Vacinas.
 * Detecta em qual tela está rodando pelos elementos do DOM.
 *
 *   vaccine-record-form.html            -> cria um registro
 *   vaccine-record-form.html?id=<id>    -> edita o registro (GET + PUT /vaccine-records/:id)
 */
document.addEventListener("DOMContentLoaded", () => {
  Utils.requireAuth();

  if ($("#record-form")) initRecordForm();
  if ($("#record-list")) initRecordList();
});

const SAVE_ICON = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>`;

/* ---------------------------------------------------------------------- */
/* Tela 5 — Registrar Nova Vacina (CREATE) / Editar registro (UPDATE)     */
/* ---------------------------------------------------------------------- */
async function initRecordForm() {
  const form = $("#record-form");
  const vaccineSelect = $("#vaccine");
  const dataInput = $("#data");
  const proximaInput = $("#proxima");
  const obsInput = $("#observacoes");
  const submitBtn = $("#btn-save");

  const editId = new URLSearchParams(window.location.search).get("id");
  const isEdit = Boolean(editId);
  const endpoint = window.API_CONFIG.ENDPOINTS.VACCINE_RECORDS;

  // No modo edição o formulário só aparece depois de carregar o registro
  let ready = !isEdit;
  if (isEdit) {
    form.hidden = true;
    $("#form-title").textContent = "Editar Vacina";
    document.title = "Editar Vacina · e-Immune";
    submitBtn.innerHTML = SAVE_ICON + " Salvar alterações";
  }

  // RN02/RN03 — não permitir data futura (vacina já aplicada)
  dataInput.max = Utils.todayISO();
  // A próxima dose só faz sentido depois de hoje
  proximaInput.min = Utils.todayISO();

  obsInput.addEventListener("input", () => {
    $("#obs-count").textContent = obsInput.value.length;
  });

  const errObs = $("#err-observacoes");
  const groups = {
    vaccineId: $("#group-vaccine"),
    dataAplicacao: $("#group-data"),
    proximaDose: $("#group-proxima"),
  };

  function clearErrors() {
    Object.values(groups).forEach((g) => Utils.clearFieldError(g));
    errObs.classList.remove("is-visible");
  }

  function showErrors(errors) {
    Object.entries(errors).forEach(([field, message]) => {
      if (groups[field]) Utils.showFieldError(groups[field], message);
      else if (field === "observacoes") {
        errObs.textContent = message;
        errObs.classList.add("is-visible");
      } else {
        // Campo sem área de erro própria (ex.: dose)
        Utils.toast(message, "error");
      }
    });
  }

  // O handler é registrado ANTES de qualquer await: evita o submit nativo do navegador
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!ready) return;
    clearErrors();

    const errors = {};
    // RN01 — Nome da vacina obrigatório
    if (!vaccineSelect.value) errors.vaccineId = "Selecione a vacina.";

    // RN01/RN03 — Data obrigatória e não pode ser futura
    if (!dataInput.value) errors.dataAplicacao = "Informe a data da aplicação.";
    else if (!Utils.isValidDate(dataInput.value)) errors.dataAplicacao = "Data inválida.";
    else if (Utils.isFutureDate(dataInput.value)) errors.dataAplicacao = "A data da aplicação não pode ser futura.";

    // Próxima dose (opcional): precisa ser depois da aplicação
    if (proximaInput.value) {
      if (!Utils.isValidDate(proximaInput.value)) errors.proximaDose = "Data da próxima dose inválida.";
      else if (dataInput.value && proximaInput.value <= dataInput.value)
        errors.proximaDose = "A próxima dose deve ser depois da data de aplicação.";
    }

    if (Object.keys(errors).length) return showErrors(errors);

    const payload = {
      vaccineId: vaccineSelect.value,
      dose: $("#dose").value.trim() || null,
      dataAplicacao: dataInput.value,
      proximaDose: proximaInput.value || null,
      local: $("#local").value.trim() || null,
      lote: $("#lote").value.trim() || null,
      observacoes: obsInput.value.trim() || null,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Salvando...";

    try {
      if (isEdit) await Api.put(`${endpoint}/${encodeURIComponent(editId)}`, payload);
      else await Api.post(endpoint, payload);

      Utils.toast(isEdit ? "Registro atualizado!" : "Vacina registrada com sucesso!", "success");
      setTimeout(() => (window.location.href = "vaccine-record-list.html"), 1000);
    } catch (err) {
      // O back-end devolve { message, errors: { campo: mensagem } } em validações (400)
      if (err.data && err.data.errors) showErrors(err.data.errors);
      else Utils.toast(err.message || "Não foi possível salvar o registro.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = SAVE_ICON + (isEdit ? " Salvar alterações" : " Salvar");
    }
  });

  // Popular select com o catálogo de vacinas (Vaccine)
  try {
    const vaccines = await Api.get(window.API_CONFIG.ENDPOINTS.VACCINES);
    (vaccines || []).forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent = v.nome;
      vaccineSelect.appendChild(opt);
    });
    if (!vaccines || vaccines.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.disabled = true;
      opt.textContent = "Nenhuma vacina cadastrada";
      vaccineSelect.appendChild(opt);
    }
  } catch (err) {
    Utils.toast("Não foi possível carregar a lista de vacinas.", "error");
  }

  // Vindo de "Próximas Doses": já preenche vacina e dose esperada
  if (!isEdit) {
    const q = new URLSearchParams(window.location.search);
    if (q.get("vaccineId")) vaccineSelect.value = q.get("vaccineId");
    if (q.get("dose")) $("#dose").value = q.get("dose");
    return;
  }

  // Modo edição: preenche o formulário com o registro atual
  try {
    const rec = await Api.get(`${endpoint}/${encodeURIComponent(editId)}`);
    vaccineSelect.value = rec.vaccineId;
    $("#dose").value = rec.dose || "";
    dataInput.value = rec.dataAplicacao || "";
    proximaInput.value = rec.proximaDose || "";
    // Se a próxima dose já passou (atrasada), o min do input a bloquearia: libera a data original
    if (rec.proximaDose && rec.proximaDose < proximaInput.min) proximaInput.min = rec.proximaDose;
    $("#local").value = rec.local || "";
    $("#lote").value = rec.lote || "";
    obsInput.value = rec.observacoes || "";
    $("#obs-count").textContent = obsInput.value.length;
    ready = true;
    form.hidden = false;
  } catch (err) {
    Utils.toast(err.message || "Registro não encontrado.", "error");
    setTimeout(() => (window.location.href = "vaccine-record-list.html"), 1400);
  }
}

/* ---------------------------------------------------------------------- */
/* Histórico de Vacinas (LIST) — abas, filtro por vacina                  */
/* ---------------------------------------------------------------------- */
let allRecords = [];
let vaccineCatalog = new Map();
let currentFilter = "all";
let currentVaccineId = "";

async function initRecordList() {
  const params = new URLSearchParams(window.location.search);
  currentFilter = params.get("filter") || "all";

  $$(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      currentFilter = chip.dataset.filter;
      renderRecords();
    });
  });

  $("#btn-filter").addEventListener("click", () => {
    const panel = $("#filter-panel");
    panel.hidden = !panel.hidden;
  });

  $("#filter-vaccine").addEventListener("change", (event) => {
    currentVaccineId = event.target.value;
    renderRecords();
  });

  try {
    const [records, vaccines] = await Promise.all([
      Api.get(window.API_CONFIG.ENDPOINTS.VACCINE_RECORDS),
      Api.get(window.API_CONFIG.ENDPOINTS.VACCINES).catch(() => []),
    ]);
    allRecords = records || [];
    (vaccines || []).forEach((v) => vaccineCatalog.set(v.id, v));
    fillVaccineFilter();
    renderRecords();
  } catch (err) {
    $("#record-skeleton").hidden = true;
    Utils.toast(err.message || "Não foi possível carregar o histórico.", "error");
  }
}

/** O endpoint de listagem não traz o nome da vacina: resolve pelo catálogo (ou por r.vaccine, se vier). */
function vaccineOf(record) {
  return record.vaccine || vaccineCatalog.get(record.vaccineId) || null;
}

function fillVaccineFilter() {
  const select = $("#filter-vaccine");
  const seen = new Map();
  allRecords.forEach((r) => {
    const v = vaccineOf(r);
    if (!seen.has(r.vaccineId)) seen.set(r.vaccineId, v?.nome || "Vacina");
  });
  [...seen.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
    .forEach(([id, nome]) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = nome;
      select.appendChild(opt);
    });
}

function doseLabel(numeroDose, vaccine) {
  if (vaccine?.dosesNecessarias === 1) return "Dose Única";
  return numeroDose ? `Dose ${numeroDose}` : "Dose Única";
}

/**
 * Expande allRecords (aplicados) em uma lista de exibição que inclui uma
 * entrada "pendente" derivada de dataProximaDose, quando a dose seguinte
 * ainda não foi registrada.
 */
function buildDisplayRecords() {
  const applied = new Set(allRecords.map((r) => `${r.vaccineId}:${r.numeroDose}`));
  const display = [];

  allRecords.forEach((r) => {
    const vaccine = vaccineOf(r);
    const vaccineNome = vaccine?.nome || "Vacina";

    display.push({
      id: r.id,
      vaccineId: r.vaccineId,
      vaccineNome,
      dose: doseLabel(r.numeroDose, vaccine),
      date: r.dataAplicacao,
      local: r.local,
      status: "applied",
    });

    const nextDose = (r.numeroDose || 0) + 1;
    if (r.dataProximaDose && !applied.has(`${r.vaccineId}:${nextDose}`)) {
      display.push({
        id: `${r.id}-next`,
        vaccineId: r.vaccineId,
        vaccineNome,
        dose: doseLabel(nextDose, vaccine),
        date: r.dataProximaDose,
        status: "pending",
      });
    }
  });

  display.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return display;
}

function renderRecords() {
  const listEl = $("#record-list");
  const emptyEl = $("#record-empty");
  const byVaccine = buildDisplayRecords().filter((r) => !currentVaccineId || r.vaccineId === currentVaccineId);

  const counts = {
    all: byVaccine.length,
    past: byVaccine.filter((r) => r.status === "applied").length,
    pending: byVaccine.filter((r) => r.status === "pending").length,
  };
  $$(".filter-chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.filter === currentFilter);
    const count = chip.querySelector(".filter-chip__count");
    if (count) count.textContent = counts[chip.dataset.filter] ?? 0;
  });

  const filtered = byVaccine.filter((r) => {
    if (currentFilter === "past") return r.status === "applied";
    if (currentFilter === "pending") return r.status === "pending";
    return true;
  });

  $("#record-skeleton").hidden = true;
  listEl.hidden = filtered.length === 0;
  emptyEl.hidden = filtered.length !== 0;

  listEl.innerHTML = filtered
    .map(
      (r) => `
    <div class="list-item" data-id="${Utils.escapeHtml(r.id)}">
      <div class="list-item__icon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2l4 4-9 9-5 1 1-5z"/></svg>
      </div>
      <div class="list-item__body">
        <div class="list-item__title">${Utils.escapeHtml(r.vaccineNome || r.nomeVacina || "Vacina")}${r.dose ? " · " + Utils.escapeHtml(r.dose) : ""}</div>
        <div class="list-item__meta">${r.status === "pending" ? "Prevista para " : ""}${Utils.formatDateBR(r.date)}${r.local ? " · " + Utils.escapeHtml(r.local) : ""}</div>
      </div>
      ${r.status === "pending" ? `<span class="status-badge status-badge--pending">Pendente</span>` : `
      <div class="list-item__actions">
        <a class="icon-btn" aria-label="Editar registro" href="vaccine-record-form.html?id=${encodeURIComponent(r.id)}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>
        </a>
        <button class="icon-btn icon-btn--danger" aria-label="Excluir registro" data-delete="${Utils.escapeHtml(r.id)}" type="button">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>
        </button>
      </div>`}
    </div>`
    )
    .join("");

  $$("[data-delete]", listEl).forEach((btn) =>
    btn.addEventListener("click", () => deleteRecord(btn.dataset.delete))
  );
}

async function deleteRecord(id) {
  if (!confirm("Remover este registro do histórico?")) return;
  try {
    await Api.del(`${window.API_CONFIG.ENDPOINTS.VACCINE_RECORDS}/${encodeURIComponent(id)}`);
    allRecords = allRecords.filter((r) => r.id !== id);
    renderRecords();
    Utils.toast("Registro removido.", "success");
  } catch (err) {
    Utils.toast(err.message || "Não foi possível remover o registro.", "error");
  }
}
