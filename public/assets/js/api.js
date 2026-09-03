/**
 * Wrapper de requisições HTTP para a API Node/Prisma.
 * Cuida de: base URL, header Authorization, parse de JSON e erros padronizados.
 */
const Api = (() => {
  const { BASE_URL, STORAGE_KEYS } = window.API_CONFIG;

  function getToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  function setSession(token, user) {
    if (token) localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER));
    } catch {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  async function request(path, { method = "GET", body, auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkError) {
      throw new ApiError(
        "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.",
        0
      );
    }

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json().catch(() => null) : null;

    if (!response.ok) {
      const message = data?.message || data?.error || "Ocorreu um erro. Tente novamente.";
      if (response.status === 401) clearSession();
      throw new ApiError(message, response.status, data);
    }

    return data;
  }

  class ApiError extends Error {
    constructor(message, status, data) {
      super(message);
      this.status = status;
      this.data = data;
    }
  }

  return {
    get: (path, opts) => request(path, { ...opts, method: "GET" }),
    post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
    put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
    del: (path, opts) => request(path, { ...opts, method: "DELETE" }),
    getToken,
    setSession,
    getUser,
    clearSession,
    ApiError,
  };
})();
