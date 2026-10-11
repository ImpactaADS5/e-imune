/**
 * Página Registrar Nova Vacina (Tela 5) + Histórico de Vacinas.
 * Este arquivo detecta em qual das duas telas está rodando pelos elementos do DOM.
 */
document.addEventListener("DOMContentLoaded", () => {
  Utils.requireAuth();

  if ($("#record-form")) initRecordForm();
  if ($("#record-list")) initRecordList();
});

/* ---------------------------------------------------------------------- */
/* Tela 5 — Registrar Nova Vacina (CREATE)                                */
/* ---------------------------------------------------------------------- */
async function initRecordForm() {
  const form = $("#record-form");
  const vaccineSelect = $("#vaccine");
  const dataInput = $("#data");
  const obsInput = $("#observacoes");
  const submitBtn = $("#btn-save");

  // RN02/RN03 — não permitir data futura (vacina já aplicada)
  dataInput.max = Utils.todayISO();

  obsInput.addEventListener("input", () => {
    $("#obs-count").textContent = obsInput.value.length;
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    let valid = true;

    Utils.clearFieldError($("#group-vaccine"));
    Utils.clearFieldError($("#group-data"));

    // RN01 — Nome da vacina obrigatório
    if (!vaccineSelect.value) {
      Utils.showFieldError($("#group-vaccine"), "Selecione a vacina.");
      valid = false;
    }
    // RN01/RN03 — Data obrigatória e não pode ser futura
    if (!dataInput.value) {
      Utils.showFieldError($("#group-data"), "Informe a data da aplicação.");
      valid = false;
    } else if (!Utils.isValidDate(dataInput.value)) {
      Utils.showFieldError($("#group-data"), "Data inválida.");
      valid = false;
    } else if (Utils.isFutureDate(dataInput.value)) {
      Utils.showFieldError($("#group-data"), "A data da aplicação não pode ser futura.");
      valid = false;
    }

    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Salvando...";

    try {
      await Api.post(window.API_CONFIG.ENDPOINTS.VACCINE_RECORDS, {
        vaccineId: vaccineSelect.value,
        numeroDose: Number($("#dose").value),
        dataAplicacao: dataInput.value,
        dataProximaDose: $("#dataProximaDose").value || null,
        local: $("#local").value.trim() || null,
        lote: $("#lote").value.trim() || null,
      });
      Utils.toast("Vacina registrada com sucesso!", "success");
      setTimeout(() => (window.location.href = "vaccine-record-list.html"), 1000);
    } catch (err) {
      Utils.toast(err.message || "Não foi possível salvar o registro.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg> Salvar`;
    }
  });
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
    <div class="list-item list-item--record" data-id="${r.id}">
      <div class="list-item__body">
        <div class="list-item__title">${escapeHtml(r.vaccineNome)}</div>
        <div class="list-item__meta">${escapeHtml(r.dose)}</div>
      </div>
      <div class="list-item__side">
        <div class="list-item__date">${Utils.formatDateBR(r.date)}</div>
        <span class="status-badge status-badge--${r.status === "pending" ? "pending" : "success"}">${r.status === "pending" ? "Pendente" : "Aplicada"}</span>
      </div>
      <button class="icon-btn list-item__chevron" aria-label="Ver detalhes" onclick="Utils.toast('Detalhes em breve.'); return false;" type="button">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>`
    )
    .join("");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
