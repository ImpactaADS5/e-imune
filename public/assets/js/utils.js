/** Utilidades compartilhadas entre as páginas */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const Utils = {
  isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
  },

  /**
   * "Hoje" no fuso de São Paulo, formato YYYY-MM-DD.
   * Não usar toISOString(): ele é UTC e, depois das 21h em SP, já devolve o dia
   * seguinte (deixaria passar uma data futura em "Data da aplicação").
   */
  todayISO() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  },

  /** Dias de calendário entre duas datas YYYY-MM-DD (to - from). */
  diffDays(fromISO, toISO) {
    return Math.round((Date.parse(toISO + "T00:00:00Z") - Date.parse(fromISO + "T00:00:00Z")) / 86400000);
  },

  /** Texto amigável para "dias restantes" (negativo = atrasada). */
  daysLabel(dias) {
    if (dias === 0) return "Hoje";
    if (dias === 1) return "Amanhã";
    if (dias > 1) return `Em ${dias} dias`;
    if (dias === -1) return "Atrasada há 1 dia";
    return `Atrasada há ${Math.abs(dias)} dias`;
  },

  /**
   * Localização do usuário (para "clínicas próximas").
   * Devolve { lat, lng } ou rejeita com uma mensagem pronta para mostrar na tela.
   * O navegador só libera a localização em HTTPS ou em localhost.
   */
  getPosition() {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        return reject(new Error("Seu navegador não permite obter a localização."));
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          const messages = {
            1: "Permissão de localização negada. Libere o acesso nas configurações do navegador.",
            2: "Não foi possível descobrir sua localização agora.",
            3: "A localização demorou demais para responder. Tente novamente.",
          };
          reject(new Error(messages[err.code] || "Não foi possível obter a localização."));
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    });
  },

  escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  },

  isFutureDate(isoDate) {
    if (!isoDate) return false;
    return isoDate > Utils.todayISO();
  },

  isValidDate(isoDate) {
    if (!isoDate) return false;
    const d = new Date(isoDate + "T00:00:00");
    return !Number.isNaN(d.getTime());
  },

  formatDateBR(isoDate) {
    if (!isoDate) return "—";
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
  },

  showFieldError(inputGroupEl, message) {
    inputGroupEl.classList.add("has-error");
    const errorEl = inputGroupEl.querySelector(".field-error");
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add("is-visible");
    }
  },

  clearFieldError(inputGroupEl) {
    inputGroupEl.classList.remove("has-error");
    const errorEl = inputGroupEl.querySelector(".field-error");
    if (errorEl) errorEl.classList.remove("is-visible");
  },

  toast(message, type = "default", duration = 3200) {
    let toastEl = $("#toast");
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "toast";
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.className = `toast is-visible ${type === "error" ? "toast--error" : ""} ${
      type === "success" ? "toast--success" : ""
    }`;
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => toastEl.classList.remove("is-visible"), duration);
  },

  /**
   * Modal de confirmação no padrão visual do app (substitui o confirm() nativo).
   * Devolve uma Promise<boolean>: true se o usuário confirmou.
   */
  confirmDialog({ title, message = "", confirmText = "Confirmar", cancelText = "Cancelar", danger = false } = {}) {
    return new Promise((resolve) => {
      const previousFocus = document.activeElement;
      const backdrop = document.createElement("div");
      backdrop.className = "dialog-backdrop";
      backdrop.innerHTML = `
        <div class="dialog ${danger ? "dialog--danger" : ""}" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-message">
          <div class="dialog__icon">
            ${danger
              ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>'
              : '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>'}
          </div>
          <p class="dialog__title" id="dialog-title">${Utils.escapeHtml(title || "Confirmar")}</p>
          <p class="dialog__message" id="dialog-message">${Utils.escapeHtml(message)}</p>
          <div class="dialog__actions">
            <button class="btn btn-ghost" type="button" data-action="cancel">${Utils.escapeHtml(cancelText)}</button>
            <button class="btn ${danger ? "btn-danger" : "btn-primary"}" type="button" data-action="confirm">${Utils.escapeHtml(confirmText)}</button>
          </div>
        </div>`;

      function close(result) {
        document.removeEventListener("keydown", onKey);
        backdrop.remove();
        if (previousFocus && previousFocus.focus) previousFocus.focus();
        resolve(result);
      }
      function onKey(event) {
        if (event.key === "Escape") close(false);
      }

      backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) close(false);
        const action = event.target.closest("[data-action]")?.dataset.action;
        if (action) close(action === "confirm");
      });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(backdrop);
      backdrop.querySelector('[data-action="cancel"]').focus();
    });
  },

  /** Protege páginas internas: redireciona para login se não houver sessão. */
  requireAuth() {
    if (!Api.getToken()) {
      window.location.href = "login.html";
    }
  },

  /** Alterna a visibilidade de campos de senha (ícone de olho). */
  bindPasswordToggle(toggleEl, inputEl) {
    toggleEl.addEventListener("click", () => {
      const isPassword = inputEl.type === "password";
      inputEl.type = isPassword ? "text" : "password";
      toggleEl.dataset.state = isPassword ? "visible" : "hidden";
    });
  },
};
