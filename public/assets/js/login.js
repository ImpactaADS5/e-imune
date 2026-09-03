document.addEventListener("DOMContentLoaded", () => {
  const form = $("#login-form");
  const emailInput = $("#email");
  const senhaInput = $("#senha");
  const submitBtn = $("#btn-login");

  Utils.bindPasswordToggle($("#toggle-senha"), senhaInput);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    let valid = true;

    Utils.clearFieldError($("#group-email"));
    Utils.clearFieldError($("#group-senha"));

    if (!emailInput.value.trim() || !Utils.isValidEmail(emailInput.value)) {
      Utils.showFieldError($("#group-email"), "Informe um e-mail válido.");
      valid = false;
    }
    if (!senhaInput.value) {
      Utils.showFieldError($("#group-senha"), "Informe sua senha.");
      valid = false;
    }
    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Entrando...";

    try {
      const data = await Api.post(
        window.API_CONFIG.ENDPOINTS.LOGIN,
        { email: emailInput.value.trim(), senha: senhaInput.value },
        { auth: false }
      );
      Api.setSession(data.token, data.user);
      window.location.href = "home.html";
    } catch (err) {
      Utils.toast(err.message || "E-mail ou senha inválidos.", "error");
      Utils.showFieldError($("#group-senha"), "Credenciais incorretas.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Entrar";
    }
  });
});
