/**
 * CRUD (create/list) do catálogo de vacinas — entidade Vaccine.
 * Detecta a tela pelo DOM: formulário de cadastro ou lista.
 */
document.addEventListener("DOMContentLoaded", () => {
  Utils.requireAuth();

  if ($("#vaccine-form")) initVaccineForm();
  if ($("#vaccine-list")) initVaccineList();
});

/* ---------------------------------------------------------------------- */
/* Cadastrar Vacina (CREATE)                                              */
/* ---------------------------------------------------------------------- */
function initVaccineForm() {
  const form = $("#vaccine-form");
  const nome = $("#nome");
  const submitBtn = $("#btn-save");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    Utils.clearFieldError($("#group-nome"));

    if (!nome.value.trim()) {
      Utils.showFieldError($("#group-nome"), "O nome da vacina é obrigatório.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Salvando...";

    try {
      await Api.post(window.API_CONFIG.ENDPOINTS.VACCINES, {
        nome: nome.value.trim(),
        fabricante: $("#fabricante").value.trim() || null,
        dosesRecomendadas: $("#doses").value ? Number($("#doses").value) : null,
      });
      Utils.toast("Vacina cadastrada com sucesso!", "success");
      setTimeout(() => (window.location.href = "vaccine-list.html"), 1000);
    } catch (err) {
      Utils.toast(err.message || "Não foi possível cadastrar a vacina.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg> Salvar`;
    }
  });
}

/* ---------------------------------------------------------------------- */
/* Vacinas Cadastradas (LIST)                                             */
/* ---------------------------------------------------------------------- */
let allVaccines = [];

async function initVaccineList() {
  try {
    allVaccines = (await Api.get(window.API_CONFIG.ENDPOINTS.VACCINES)) || [];
    renderVaccines();
  } catch (err) {
    $("#vaccine-skeleton").hidden = true;
    Utils.toast(err.message || "Não foi possível carregar as vacinas.", "error");
  }
}

function renderVaccines() {
  const listEl = $("#vaccine-list");
  const emptyEl = $("#vaccine-empty");

  $("#vaccine-skeleton").hidden = true;
  listEl.hidden = allVaccines.length === 0;
  emptyEl.hidden = allVaccines.length !== 0;

  listEl.innerHTML = allVaccines
    .map(
      (v) => `
    <div class="list-item" data-id="${v.id}">
      <div class="list-item__icon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2l4 4-9 9-5 1 1-5z"/></svg>
      </div>
      <div class="list-item__body">
        <div class="list-item__title">${escapeHtmlV(v.nome)}</div>
        <div class="list-item__meta">${v.fabricante ? escapeHtmlV(v.fabricante) : "Fabricante não informado"}${
        v.dosesRecomendadas ? " · " + v.dosesRecomendadas + " doses" : ""
      }</div>
      </div>
      <div class="list-item__actions">
        <button class="icon-btn icon-btn--danger" aria-label="Excluir vacina" onclick="deleteVaccine('${v.id}')" type="button">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>
        </button>
      </div>
    </div>`
    )
    .join("");
}

async function deleteVaccine(id) {
  if (!confirm("Remover esta vacina do catálogo?")) return;
  try {
    await Api.del(`${window.API_CONFIG.ENDPOINTS.VACCINES}/${id}`);
    allVaccines = allVaccines.filter((v) => v.id !== id);
    renderVaccines();
    Utils.toast("Vacina removida.", "success");
  } catch (err) {
    Utils.toast(err.message || "Não foi possível remover a vacina.", "error");
  }
}

function escapeHtmlV(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
