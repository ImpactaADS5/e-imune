document.addEventListener("DOMContentLoaded", async () => {
  Utils.requireAuth();

  const user = Api.getUser();
  if (user?.nome) {
    $("#greeting").textContent = `Olá, ${user.nome.split(" ")[0]}! 👋`;
  }

  try {
    const records = await Api.get(window.API_CONFIG.ENDPOINTS.VACCINE_RECORDS);
    renderStatus(records || []);
    renderNextDose(records || []);
  } catch (err) {
    $("#status-tag").textContent = "Não foi possível carregar seu status agora.";
  }
});

function renderStatus(records) {
  const total = records.length;
  const vaccines = new Map();
  records.forEach((record) => vaccines.set(record.vaccineId, record.vaccine?.dosesNecessarias || 1));
  const meta = Math.max(1, [...vaccines.values()].reduce((sum, doses) => sum + doses, 0));
  const pct = Math.min(100, Math.round((total / meta) * 100));

  $("#status-ring").style.setProperty("--pct", pct);
  $("#status-pct").textContent = pct;

  const tag = $("#status-tag");
  if (pct >= 80) tag.innerHTML = starIcon() + " Excelente progresso!";
  else if (pct >= 40) tag.innerHTML = starIcon() + " Bom progresso!";
  else tag.innerHTML = starIcon() + " Vamos começar!";
}

function starIcon() {
  return `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.9-5 4.8 1.3 6.8L12 17.7 5.9 20.8l1.3-6.8-5-4.8 6.9-.9z"/></svg>`;
}

function renderNextDose(records) {
  const today = Utils.todayISO();
  const upcoming = records
    .filter((r) => r.dataProximaDose && r.dataProximaDose >= today)
    .sort((a, b) => a.dataProximaDose.localeCompare(b.dataProximaDose))[0];

  if (!upcoming) return;

  $("#next-dose-card").style.display = "block";
  $("#next-dose-name").textContent = `${upcoming.vaccineNome || upcoming.nomeVacina || "Vacina"}${
    upcoming.numeroDose ? " – " + upcoming.numeroDose + "ª Dose" : ""
  }`;
  $("#next-dose-date").textContent = Utils.formatDateBR(upcoming.dataProximaDose);
}
