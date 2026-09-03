/** Tela de Splash: exibe carregamento e direciona conforme sessão existente. */
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const isLogged = Boolean(Api.getToken());
    window.location.href = isLogged ? "home.html" : "login.html";
  }, 1800);
});
