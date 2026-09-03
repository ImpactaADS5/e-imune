/**
 * Configuração central da API.
 * Ajuste apenas BASE_URL para apontar para o backend Node/Prisma.
 */
window.API_CONFIG = {
  BASE_URL: "http://localhost:3333/api",
  ENDPOINTS: {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    ME: "/users/me",
    VACCINES: "/vaccines",
    VACCINE_RECORDS: "/vaccine-records",
  },
  STORAGE_KEYS: {
    TOKEN: "eimmune_token",
    USER: "eimmune_user",
  },
};
