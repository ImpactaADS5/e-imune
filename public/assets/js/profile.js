/**
 * Perfil e sub-telas (AC3): Perfil, Dados Pessoais, Configurações da Conta,
 * Alterar senha, Preferências de Notificações, Segurança e Termos de Uso.
 * Cada tela é detectada pelos elementos do DOM (mesmo padrão de vaccine-record.js).
 *
 * Endpoints de perfil, senha, 2FA, sessões e preferências seguem o contrato
 * proposto em config.js (ENDPOINTS) — alinhar com o back-end antes de sair do mock.
 */
document.addEventListener("DOMContentLoaded", () => {
  Utils.requireAuth();

  if ($("#profile-avatar")) initProfile();
  if ($("#personal-form")) initPersonal();
  if ($("#btn-delete-account")) initAccount();
  if ($("#password-form")) initPassword();
  if ($("#prefs-list")) initNotifications();
  if ($("#two-factor")) initSecurity();
  if ($("#terms-list")) initTerms();
});

const ENDPOINTS = () => window.API_CONFIG.ENDPOINTS;

/** Mostra os erros de campo devolvidos pela API ({ errors: { campo: "msg" } }). */
function showApiErrors(err, fallbackMessage) {
  const errors = err.data?.errors || {};
  let shown = false;
  Object.entries(errors).forEach(([field, message]) => {
    const group = $(`#group-${field}`);
    if (group) {
      Utils.showFieldError(group, message);
      shown = true;
    }
  });
  if (!shown) Utils.toast(err.message || fallbackMessage, "error");
}

function clearFormErrors(form) {
  $$(".input-group", form).forEach((g) => Utils.clearFieldError(g));
}

/** Encerra a sessão no servidor (se possível) e volta para o login. */
async function endSession() {
  try {
    await Api.post(ENDPOINTS().LOGOUT, {});
  } catch {
    // mesmo se o servidor falhar, a sessão local é encerrada
  }
  Api.clearSession();
  window.location.href = "login.html";
}

/* ---------------------------------------------------------------------- */
/* Perfil                                                                  */
/* ---------------------------------------------------------------------- */
function initialsOf(nome) {
  const parts = String(nome || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

async function initProfile() {
  const render = (user) => {
    $("#profile-avatar").textContent = initialsOf(user?.nome);
    $("#profile-name").textContent = user?.nome || "";
    $("#profile-email").textContent = user?.email || "";
  };
  render(Api.getUser());

  $("#btn-help").addEventListener("click", () => Utils.toast("Ajuda e Suporte em breve."));
  $("#btn-logout").addEventListener("click", async () => {
    const confirmed = await Utils.confirmDialog({
      title: "Sair da conta?",
      message: "Você precisará entrar novamente para acessar seu histórico.",
      confirmText: "Sair",
      danger: true,
    });
    if (confirmed) endSession();
  });

  try {
    const user = await Api.get(ENDPOINTS().ME);
    render(user);
  } catch {
    // mantém os dados salvos no login
  }

  // Ponto vermelho no sino quando há avisos de lembrete pendentes
  Api.get(ENDPOINTS().REMINDERS_DUE)
    .then((due) => { $("#profile-dot").hidden = !(due && due.length); })
    .catch(() => {});
}

/* ---------------------------------------------------------------------- */
/* Dados Pessoais                                                          */
/* ---------------------------------------------------------------------- */
/** Formata enquanto digita: (11) 99999-9999 ou (11) 9999-9999. */
function formatPhone(value) {
  const d = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

async function initPersonal() {
  const form = $("#personal-form");
  const saveBtn = $("#btn-save-personal");
  const fields = { nome: $("#nome"), dataNascimento: $("#dataNascimento"), telefone: $("#telefone"), email: $("#email") };
  fields.dataNascimento.max = Utils.todayISO();
  fields.telefone.addEventListener("input", () => {
    fields.telefone.value = formatPhone(fields.telefone.value);
  });

  try {
    const user = await Api.get(ENDPOINTS().ME);
    fields.nome.value = user.nome || "";
    fields.dataNascimento.value = (user.dataNascimento || "").slice(0, 10);
    fields.telefone.value = formatPhone(user.telefone);
    fields.email.value = user.email || "";
    saveBtn.disabled = false;
    // "Alterar e-mail" (Configurações da Conta) abre esta tela com ?campo=email
    if (new URLSearchParams(window.location.search).get("campo") === "email") {
      fields.email.focus({ preventScroll: true });
      fields.email.select();
    }
  } catch (err) {
    Utils.toast(err.message || "Não foi possível carregar seus dados.", "error");
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFormErrors(form);

    const nome = fields.nome.value.trim();
    const email = fields.email.value.trim();
    const telefoneDigits = fields.telefone.value.replace(/\D/g, "");
    const dataNascimento = fields.dataNascimento.value;
    let valid = true;

    if (nome.length < 3) {
      Utils.showFieldError($("#group-nome"), "Informe o nome completo.");
      valid = false;
    }
    if (dataNascimento && (!Utils.isValidDate(dataNascimento) || Utils.isFutureDate(dataNascimento))) {
      Utils.showFieldError($("#group-dataNascimento"), "Data de nascimento inválida.");
      valid = false;
    }
    if (telefoneDigits && (telefoneDigits.length < 10 || telefoneDigits.length > 11)) {
      Utils.showFieldError($("#group-telefone"), "Informe o telefone com DDD.");
      valid = false;
    }
    if (!Utils.isValidEmail(email)) {
      Utils.showFieldError($("#group-email"), "Informe um e-mail válido.");
      valid = false;
    }
    if (!valid) return;

    saveBtn.disabled = true;
    saveBtn.textContent = "Salvando...";
    try {
      const user = await Api.put(ENDPOINTS().ME, {
        nome,
        email,
        telefone: telefoneDigits || null,
        dataNascimento: dataNascimento || null,
      });
      // Mantém nome/e-mail do cabeçalho em dia sem precisar logar de novo
      Api.setSession(null, { ...(Api.getUser() || {}), id: user.id, nome: user.nome, email: user.email });
      Utils.toast("Dados atualizados!", "success");
    } catch (err) {
      showApiErrors(err, "Não foi possível salvar seus dados.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Salvar alterações";
    }
  });
}

/* ---------------------------------------------------------------------- */
/* Configurações da Conta                                                  */
/* ---------------------------------------------------------------------- */
function initAccount() {
  const recoveryBtn = $("#btn-recovery");
  recoveryBtn.addEventListener("click", () => {
    const info = $("#recovery-info");
    const email = Api.getUser()?.email;
    info.textContent =
      `Se esquecer sua senha, toque em “Esqueceu a senha?” na tela de login. ` +
      `Enviaremos as instruções de recuperação para ${email || "o e-mail cadastrado"}. ` +
      `Mantenha seu e-mail atualizado em Dados Pessoais.`;
    info.hidden = !info.hidden;
    recoveryBtn.setAttribute("aria-expanded", String(!info.hidden));
  });

  $("#btn-delete-account").addEventListener("click", async () => {
    const confirmed = await Utils.confirmDialog({
      title: "Excluir conta?",
      message: "Sua conta, seu histórico de vacinas e seus lembretes serão apagados permanentemente. Essa ação não pode ser desfeita.",
      confirmText: "Excluir conta",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await Api.del(ENDPOINTS().ME);
      Api.clearSession();
      window.location.href = "login.html";
    } catch (err) {
      Utils.toast(err.message || "Não foi possível excluir a conta.", "error");
    }
  });
}

/* ---------------------------------------------------------------------- */
/* Alterar senha                                                           */
/* ---------------------------------------------------------------------- */
function initPassword() {
  const form = $("#password-form");
  const btn = $("#btn-save-password");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFormErrors(form);
    const senhaAtual = $("#senhaAtual").value;
    const novaSenha = $("#novaSenha").value;
    const confirmar = $("#confirmarSenha").value;
    let valid = true;

    if (!senhaAtual) {
      Utils.showFieldError($("#group-senhaAtual"), "Informe a senha atual.");
      valid = false;
    }
    if (novaSenha.length < 6) {
      Utils.showFieldError($("#group-novaSenha"), "A nova senha deve ter pelo menos 6 caracteres.");
      valid = false;
    } else if (novaSenha === senhaAtual) {
      Utils.showFieldError($("#group-novaSenha"), "A nova senha deve ser diferente da atual.");
      valid = false;
    }
    if (confirmar !== novaSenha) {
      Utils.showFieldError($("#group-confirmarSenha"), "As senhas não conferem.");
      valid = false;
    }
    if (!valid) return;

    btn.disabled = true;
    btn.textContent = "Salvando...";
    try {
      await Api.put(ENDPOINTS().ME_PASSWORD, { senhaAtual, novaSenha });
      form.reset();
      Utils.toast("Senha alterada com sucesso!", "success");
    } catch (err) {
      showApiErrors(err, "Não foi possível alterar a senha.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Alterar senha";
    }
  });
}

/* ---------------------------------------------------------------------- */
/* Preferências de Notificações                                            */
/* ---------------------------------------------------------------------- */
async function initNotifications() {
  const inputs = $$("[data-pref]");
  try {
    const prefs = await Api.get(ENDPOINTS().ME_NOTIFICATIONS);
    inputs.forEach((input) => {
      input.checked = Boolean(prefs?.[input.dataset.pref]);
      input.disabled = false;
    });
  } catch (err) {
    Utils.toast(err.message || "Não foi possível carregar suas preferências.", "error");
    return;
  }

  inputs.forEach((input) =>
    input.addEventListener("change", async () => {
      const value = input.checked;
      input.disabled = true;
      try {
        await Api.put(ENDPOINTS().ME_NOTIFICATIONS, { [input.dataset.pref]: value });
        Utils.toast("Preferência salva.", "success", 1800);
      } catch (err) {
        input.checked = !value;
        Utils.toast(err.message || "Não foi possível salvar a preferência.", "error");
      } finally {
        input.disabled = false;
      }
    })
  );
}

/* ---------------------------------------------------------------------- */
/* Segurança                                                               */
/* ---------------------------------------------------------------------- */
let sessions = [];

function renderSecurityCard(twoFactorEnabled) {
  $("#security-card").classList.toggle("security-card--warning", !twoFactorEnabled);
  $("#security-title").textContent = twoFactorEnabled ? "Sua conta está protegida!" : "Proteja ainda mais sua conta";
  $("#security-text").textContent = twoFactorEnabled
    ? "Mantenha sua conta segura e seus dados protegidos."
    : "Ative a autenticação em duas etapas para dificultar o acesso de outras pessoas.";
}

async function initSecurity() {
  const twoFactor = $("#two-factor");

  try {
    const user = await Api.get(ENDPOINTS().ME);
    twoFactor.checked = Boolean(user.twoFactorEnabled);
    twoFactor.disabled = false;
    renderSecurityCard(twoFactor.checked);
  } catch (err) {
    Utils.toast(err.message || "Não foi possível carregar suas configurações.", "error");
  }

  twoFactor.addEventListener("change", async () => {
    const enabled = twoFactor.checked;
    twoFactor.disabled = true;
    try {
      await Api.put(ENDPOINTS().ME_TWO_FACTOR, { enabled });
      renderSecurityCard(enabled);
      Utils.toast(enabled ? "Autenticação em duas etapas ativada." : "Autenticação em duas etapas desativada.", "success");
    } catch (err) {
      twoFactor.checked = !enabled;
      Utils.toast(err.message || "Não foi possível alterar a autenticação em duas etapas.", "error");
    } finally {
      twoFactor.disabled = false;
    }
  });

  const sessionsBtn = $("#btn-sessions");
  sessionsBtn.addEventListener("click", () => {
    const list = $("#sessions-list");
    list.hidden = !list.hidden;
    sessionsBtn.setAttribute("aria-expanded", String(!list.hidden));
  });
  loadSessions();
}

async function loadSessions() {
  try {
    sessions = (await Api.get(ENDPOINTS().SESSIONS)) || [];
    renderSessions();
  } catch {
    $("#sessions-count").textContent = "Não foi possível carregar as sessões.";
  }
}

function formatDateTime(iso) {
  if (!iso) return "";
  const [date, time = ""] = iso.split("T");
  return `${Utils.formatDateBR(date)}${time ? " às " + time.slice(0, 5) : ""}`;
}

function renderSessions() {
  const n = sessions.length;
  $("#sessions-count").textContent = `${n} ${n === 1 ? "sessão ativa" : "sessões ativas"}`;
  const list = $("#sessions-list");
  list.innerHTML = sessions
    .map(
      (s) => `
    <div class="session-item">
      <div class="session-item__body">
        <div class="session-item__device">${Utils.escapeHtml(s.dispositivo || s.userAgent || "Dispositivo")}</div>
        <div class="session-item__meta">Desde ${formatDateTime(s.criadoEm)}${s.ip ? " · " + Utils.escapeHtml(s.ip) : ""}</div>
      </div>
      ${s.atual
        ? '<span class="session-item__tag">Este dispositivo</span>'
        : `<button class="session-item__end" type="button" data-session="${Utils.escapeHtml(s.id)}">Encerrar</button>`}
    </div>`
    )
    .join("");

  $$("[data-session]", list).forEach((btn) =>
    btn.addEventListener("click", async () => {
      const confirmed = await Utils.confirmDialog({
        title: "Encerrar sessão?",
        message: "Esse dispositivo precisará entrar novamente para acessar sua conta.",
        confirmText: "Encerrar",
        danger: true,
      });
      if (!confirmed) return;
      try {
        await Api.del(`${ENDPOINTS().SESSIONS}/${encodeURIComponent(btn.dataset.session)}`);
        sessions = sessions.filter((s) => s.id !== btn.dataset.session);
        renderSessions();
        Utils.toast("Sessão encerrada.", "success");
      } catch (err) {
        Utils.toast(err.message || "Não foi possível encerrar a sessão.", "error");
      }
    })
  );
}

/* ---------------------------------------------------------------------- */
/* Termos de Uso e Política de Privacidade                                 */
/* ---------------------------------------------------------------------- */
function initTerms() {
  $$("#terms-list [aria-controls]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      panel.hidden = !panel.hidden;
      btn.setAttribute("aria-expanded", String(!panel.hidden));
    })
  );
}
