/**
 * Tela Unidades de Saúde Próximas (AC3).
 * Usa GET /clinics/nearby?lat=&lng=&raio= (distância calculada no back) e
 * mostra as unidades no mapa (Leaflet + OpenStreetMap) e em lista.
 * Se a localização não for liberada, usa o centro de São Paulo como referência.
 */
const FALLBACK_POSITION = { lat: -23.5505, lng: -46.6333 }; // Praça da Sé, São Paulo
const MAX_RESULTS = 20;

let position = null;
let usingFallback = false;
let clinics = [];
let selectedId = null;
let map = null;
let markers = new Map();
let userMarker = null;

const PIN_SVG = (color) => `
  <svg viewBox="0 0 32 42" width="32" height="42">
    <path d="M16 0C7.2 0 0 7 0 15.7 0 27.5 16 42 16 42s16-14.5 16-26.3C32 7 24.8 0 16 0z" fill="${color}"/>
    <path d="M16 8v15M8.5 15.5h15" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>
  </svg>`;

document.addEventListener("DOMContentLoaded", () => {
  Utils.requireAuth();
  initMap();

  $("#btn-info").addEventListener("click", () =>
    Utils.toast("Distâncias em linha reta a partir da sua localização. Confirme horários e vacinas disponíveis com a unidade.", "default", 5000)
  );
  $("#btn-filters").addEventListener("click", (e) => {
    const panel = $("#clinic-filters");
    panel.hidden = !panel.hidden;
    e.currentTarget.setAttribute("aria-expanded", String(!panel.hidden));
  });
  $("#clinic-radius").addEventListener("change", loadClinics);
  $("#clinic-query").addEventListener("input", render);
  $("#clinic-sort").addEventListener("change", render);
  $("#btn-locate").addEventListener("click", locate);

  locate();
});

/* ---------------------------------------------------------------------- */
/* Mapa                                                                    */
/* ---------------------------------------------------------------------- */
function initMap() {
  const el = $("#clinic-map");
  if (typeof L === "undefined") {
    el.classList.add("clinic-map--unavailable");
    el.textContent = "Não foi possível carregar o mapa. A lista de unidades continua disponível abaixo.";
    $("#btn-locate").hidden = true;
    return;
  }
  map = L.map(el, { zoomControl: false, attributionControl: true }).setView([FALLBACK_POSITION.lat, FALLBACK_POSITION.lng], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map);
}

function clinicIcon(active) {
  return L.divIcon({
    className: `clinic-pin${active ? " clinic-pin--active" : ""}`,
    html: PIN_SVG(active ? "#0B2E4A" : "#0E7C74"),
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
  });
}

function drawMap(list) {
  if (!map) return;
  markers.forEach((m) => m.remove());
  markers = new Map();

  if (userMarker) userMarker.remove();
  userMarker = L.marker([position.lat, position.lng], {
    icon: L.divIcon({ className: "user-pin", html: "<span></span>", iconSize: [18, 18], iconAnchor: [9, 9] }),
    keyboard: false,
    title: usingFallback ? "Referência: centro de São Paulo" : "Você está aqui",
  }).addTo(map);

  list.forEach((c) => {
    const marker = L.marker([c.latitude, c.longitude], { icon: clinicIcon(c.id === selectedId), title: c.nome })
      .addTo(map)
      .bindPopup(`<strong>${Utils.escapeHtml(c.nome)}</strong><br>${Utils.escapeHtml(addressOf(c))}<br>${formatKm(c.distanciaKm)}`);
    marker.on("click", () => select(c.id, { fromMap: true }));
    markers.set(c.id, marker);
  });
}

function fitMap(list) {
  if (!map) return;
  const points = [[position.lat, position.lng], ...list.map((c) => [c.latitude, c.longitude])];
  if (points.length === 1) map.setView(points[0], 14);
  else map.fitBounds(points, { padding: [28, 28], maxZoom: 15 });
}

/* ---------------------------------------------------------------------- */
/* Dados                                                                   */
/* ---------------------------------------------------------------------- */
async function locate() {
  const notice = $("#clinic-notice");
  try {
    position = await Utils.getPosition();
    usingFallback = false;
    notice.hidden = true;
  } catch (err) {
    position = position && !usingFallback ? position : FALLBACK_POSITION;
    usingFallback = position === FALLBACK_POSITION;
    if (usingFallback) {
      notice.textContent = `${err.message} Mostrando unidades perto do centro de São Paulo.`;
      notice.hidden = false;
    }
  }
  await loadClinics();
}

async function loadClinics() {
  if (!position) return;
  const radius = $("#clinic-radius").value;
  const params = new URLSearchParams({
    lat: position.lat.toFixed(5),
    lng: position.lng.toFixed(5),
    raio: radius,
    limit: String(MAX_RESULTS),
  });

  $("#clinic-skeleton").hidden = false;
  $("#clinic-list").hidden = true;
  $("#clinic-empty").hidden = true;
  try {
    clinics = (await Api.get(`${window.API_CONFIG.ENDPOINTS.CLINICS_NEARBY}?${params}`)) || [];
    if (!clinics.some((c) => c.id === selectedId)) selectedId = clinics[0]?.id || null;
    render();
    fitMap(clinics);
  } catch (err) {
    clinics = [];
    render();
    Utils.toast(err.message || "Não foi possível buscar as unidades.", "error");
  }
}

/* ---------------------------------------------------------------------- */
/* Lista                                                                   */
/* ---------------------------------------------------------------------- */
function addressOf(c) {
  const city = [c.cidade, c.uf].filter(Boolean).join("/");
  return [c.endereco, city].filter(Boolean).join(" – ");
}

function formatKm(km) {
  return `${Number(km).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

function normalize(text) {
  return String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function visibleClinics() {
  const query = normalize($("#clinic-query").value.trim());
  const list = clinics.filter((c) => !query || normalize(`${c.nome} ${addressOf(c)}`).includes(query));
  if ($("#clinic-sort").value === "name") list.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  else list.sort((a, b) => a.distanciaKm - b.distanciaKm);
  return list;
}

function render() {
  const list = visibleClinics();
  const listEl = $("#clinic-list");
  const hasQuery = $("#clinic-query").value.trim() !== "";

  $("#clinic-skeleton").hidden = true;
  listEl.hidden = list.length === 0;
  $("#clinic-empty").hidden = list.length !== 0;
  $("#clinic-empty-text").textContent = hasQuery
    ? "Nenhuma unidade corresponde à sua busca."
    : "Tente aumentar a distância máxima em Filtros.";

  listEl.innerHTML = list
    .map(
      (c) => `
    <button class="clinic-item${c.id === selectedId ? " is-active" : ""}" type="button" data-id="${Utils.escapeHtml(c.id)}" aria-pressed="${c.id === selectedId}">
      <span class="clinic-item__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 21V8l8-4 8 4v13"/><path d="M2 21h20"/><path d="M12 7v5M9.5 9.5h5"/><path d="M8 14h2M14 14h2M8 17h2M14 17h2"/></svg>
      </span>
      <span class="clinic-item__body">
        <span class="clinic-item__name">${Utils.escapeHtml(c.nome)}</span>
        <span class="clinic-item__line">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.5-7-11a7 7 0 0114 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
          ${Utils.escapeHtml(addressOf(c))}
        </span>
        ${c.telefone ? `<span class="clinic-item__line">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z"/></svg>
          ${Utils.escapeHtml(c.telefone)}
        </span>` : ""}
        <span class="clinic-item__distance">${formatKm(c.distanciaKm)}</span>
      </span>
      <svg class="clinic-item__chevron" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
    </button>`
    )
    .join("");

  $$(".clinic-item", listEl).forEach((btn) => btn.addEventListener("click", () => select(btn.dataset.id)));
  drawMap(list);
  updateRoutesButton();
}

function select(id, { fromMap = false } = {}) {
  selectedId = id;
  render();
  const clinic = clinics.find((c) => c.id === id);
  const marker = markers.get(id);
  if (map && clinic && marker) {
    map.panTo([clinic.latitude, clinic.longitude]);
    marker.openPopup();
  }
  if (fromMap) $(`.clinic-item[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/** "Ver rotas no mapa" abre a rota até a unidade selecionada no Google Maps. */
function updateRoutesButton() {
  const btn = $("#btn-routes");
  const clinic = clinics.find((c) => c.id === selectedId);
  if (!clinic) {
    btn.setAttribute("aria-disabled", "true");
    btn.removeAttribute("href");
    return;
  }
  btn.setAttribute("aria-disabled", "false");
  btn.href = `https://www.google.com/maps/dir/?api=1&destination=${clinic.latitude},${clinic.longitude}`;
  btn.setAttribute("aria-label", `Ver rotas até ${clinic.nome}`);
}
