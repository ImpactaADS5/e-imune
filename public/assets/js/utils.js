/** Utilidades compartilhadas entre as páginas */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const Utils = {
  isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
  },

  /** Converte "DD/MM/AAAA" digitado em <input type=date> nativo — aqui assumimos input type=date (ISO). */
  todayISO() {
    return new Date().toISOString().split("T")[0];
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
