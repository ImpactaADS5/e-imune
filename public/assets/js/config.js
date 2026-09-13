/**
 * Configuração central da API.
 * Ajuste apenas BASE_URL para apontar para o backend Node/Prisma.
 */

window.API_CONFIG = {
  BASE_URL: "/api",
  ENDPOINTS: {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    ME: "/auth/me",
    VACCINES: "/vaccines",
    VACCINE_RECORDS: "/vaccine-records",
    CAMPAIGNS: "/campaigns",
    CLINICS: "/clinics",
    REMINDERS: "/reminders",
  },
  STORAGE_KEYS: {
    TOKEN: "eimmune_token",
    USER: "eimmune_user",
  },
};
