document.addEventListener("DOMContentLoaded", () => {
  const form = $("#register-form");
  const nome = $("#nome");
  const email = $("#email");
  const nascimento = $("#nascimento");
  const senha = $("#senha");
  const confirmar = $("#confirmar");
  const submitBtn = $("#btn-register");

  nascimento.max = Utils.todayISO();
  Utils.bindPasswordToggle($("#toggle-senha"), senha);
  Utils.bindPasswordToggle($("#toggle-confirmar"), confirmar);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    let valid = true;

    ["nome", "email", "nascimento", "senha", "confirmar"].forEach((id) =>
      Utils.clearFieldError($(`#group-${id}`))
    );

    // RN01 — Nome completo
    if (!nome.value.trim()) {
      Utils.showFieldError($("#group-nome"), "O nome completo é obrigatório.");
      valid = false;
    }
    // RN02 — E-mail válido
    if (!email.value.trim() || !Utils.isValidEmail(email.value)) {
      Utils.showFieldError($("#group-email"), "Informe um e-mail válido.");
      valid = false;
    }
    // RN04 — Data de nascimento não pode ser futura ou inexistente
    if (!nascimento.value || !Utils.isValidDate(nascimento.value) || Utils.isFutureDate(nascimento.value)) {
      Utils.showFieldError($("#group-nascimento"), "Informe uma data de nascimento válida.");
      valid = false;
    }
    // RN05 — Critério mínimo de senha
    if (!senha.value || senha.value.length < 6) {
      Utils.showFieldError($("#group-senha"), "A senha deve ter ao menos 6 caracteres.");
      valid = false;
    }
    // RN06 — Confirmação idêntica
    if (!confirmar.value || confirmar.value !== senha.value) {
      Utils.showFieldError($("#group-confirmar"), "As senhas não coincidem.");
      valid = false;
    }

    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Cadastrando...";

    try {
      await Api.post(
        window.API_CONFIG.ENDPOINTS.REGISTER,
        {
          nome: nome.value.trim(),
          email: email.value.trim(),
          dataNascimento: nascimento.value,
          senha: senha.value,
        },
        { auth: false }
      );
      Utils.toast("Conta criada com sucesso! Faça login para continuar.", "success");
      setTimeout(() => (window.location.href = "login.html"), 1400);
    } catch (err) {
      // RN03 — E-mail já cadastrado
      if (err.status === 409) {
        Utils.showFieldError($("#group-email"), "Este e-mail já possui um cadastro.");
      } else {
        Utils.toast(err.message || "Não foi possível concluir o cadastro.", "error");
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Cadastrar";
    }
  });
});
