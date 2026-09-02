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
        dose: $("#dose").value.trim() || null,
        dataAplicacao: dataInput.value,
        local: $("#local").value.trim() || null,
        lote: $("#lote").value.trim() || null,
        observacoes: obsInput.value.trim() || null,
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

function renderRecords() {
  const today = Utils.todayISO();
  const listEl = $("#record-list");
  const emptyEl = $("#record-empty");

  const filtered = allRecords.filter((r) => {
    if (currentFilter === "past") return r.dataAplicacao <= today;
    if (currentFilter === "upcoming") return r.dataAplicacao > today;
    return true;
  });

  $("#record-skeleton").hidden = true;
  listEl.hidden = filtered.length === 0;
  emptyEl.hidden = filtered.length !== 0;

  listEl.innerHTML = filtered
    .map(
      (r) => `
    <div class="list-item" data-id="${r.id}">
      <div class="list-item__icon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2l4 4-9 9-5 1 1-5z"/></svg>
      </div>
      <div class="list-item__body">
        <div class="list-item__title">${escapeHtml(r.vaccineNome || r.nomeVacina || "Vacina")}${r.dose ? " · " + escapeHtml(r.dose) : ""}</div>
        <div class="list-item__meta">${Utils.formatDateBR(r.dataAplicacao)}${r.local ? " · " + escapeHtml(r.local) : ""}</div>
      </div>
      <div class="list-item__actions">
        <button class="icon-btn icon-btn--danger" aria-label="Excluir registro" onclick="deleteRecord('${r.id}')" type="button">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>
        </button>
      </div>
    </div>`
    )
    .join("");
}

async function deleteRecord(id) {
  if (!confirm("Remover este registro do histórico?")) return;
  try {
    await Api.del(`${window.API_CONFIG.ENDPOINTS.VACCINE_RECORDS}/${id}`);
    allRecords = allRecords.filter((r) => r.id !== id);
    renderRecords();
    Utils.toast("Registro removido.", "success");
  } catch (err) {
    Utils.toast(err.message || "Não foi possível remover o registro.", "error");
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
