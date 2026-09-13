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
/* Histórico de Vacinas (LIST)                                            */
/* ---------------------------------------------------------------------- */
let allRecords = [];
let currentFilter = "all";

async function initRecordList() {
  const params = new URLSearchParams(window.location.search);
  currentFilter = params.get("filter") || "all";

  $$(".filter-chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.filter === currentFilter);
    chip.addEventListener("click", () => {
      currentFilter = chip.dataset.filter;
      $$(".filter-chip").forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      renderRecords();
    });
  });

  try {
    allRecords = (await Api.get(window.API_CONFIG.ENDPOINTS.VACCINE_RECORDS)) || [];
    allRecords.sort((a, b) => (b.dataAplicacao || "").localeCompare(a.dataAplicacao || ""));
    renderRecords();
  } catch (err) {
    $("#record-skeleton").hidden = true;
    Utils.toast(err.message || "Não foi possível carregar o histórico.", "error");
  }
}

/**
 * Expande allRecords (registros aplicados) em uma lista de exibição que
 * inclui uma entrada "pendente" derivada de dataProximaDose, quando houver.
 */
function buildDisplayRecords() {
  const display = [];

  allRecords.forEach((r) => {
    const vaccineNome = r.vaccineNome || r.nomeVacina || "Vacina";

    display.push({
      id: r.id,
      recordId: r.id,
      vaccineNome,
       dose: r.numeroDose ? `${r.numeroDose}ª Dose` : "Dose única",
      date: r.dataAplicacao,
      status: "applied",
    });

    if (r.dataProximaDose) {
      display.push({
        id: `${r.id}-next`,
        recordId: r.id,
        vaccineNome,
        dose: nextDoseLabel(r.numeroDose),
        date: r.dataProximaDose,
        status: "pending",
      });
    }
  });

  display.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return display;
}

/** Tenta derivar o rótulo da próxima dose a partir do texto livre da dose atual. */
function nextDoseLabel(dose) {
  const match = String(dose || "").match(/^(\d+)/);
  if (match) return `${Number(match[1]) + 1}ª Dose`;
  return "Próxima dose";
}

function renderRecords() {
  const listEl = $("#record-list");
  const emptyEl = $("#record-empty");
  const display = buildDisplayRecords();

  const filtered = display.filter((r) => {
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
