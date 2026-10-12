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
