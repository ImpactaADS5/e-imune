/**
 * Configuração central da API.
 *
 * MOCK_MODE = true  -> o app funciona 100% no navegador, sem servidor,
 *                       usando localStorage como "banco de dados" falso.
 *                       Login de teste: admin / admin
 * MOCK_MODE = false -> o app passa a chamar de verdade a API em BASE_URL
 *                       (Node.js + Prisma). É só o time de back-end avisar
 *                       que a API está no ar e trocar esta flag.
 */
window.API_CONFIG = {
  MOCK_MODE: true,
  BASE_URL: "/api", // mesma origem do Express (porta 3000). Se a API ficar em outra porta, use a URL completa.
  ENDPOINTS: {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    ME: "/users/me",
    VACCINES: "/vaccines",
    VACCINE_RECORDS: "/vaccine-records",
    VACCINE_RECORDS_SUMMARY: "/vaccine-records/summary",
    NEXT_DOSES: "/vaccine-records/next-doses",
    REMINDERS: "/reminders",
    REMINDERS_DUE: "/reminders/due",
    CAMPAIGNS_FEATURED: "/campaigns/featured",
    CLINICS_NEARBY: "/clinics/nearby",
    // Perfil (AC3) — contrato proposto pelo front; alinhar com o back-end (Aylon)
    LOGOUT: "/auth/logout",
    SESSIONS: "/auth/sessions",
    ME_PASSWORD: "/users/me/password",
    ME_TWO_FACTOR: "/users/me/2fa",
    ME_NOTIFICATIONS: "/users/me/notification-preferences",
  },
  STORAGE_KEYS: {
    TOKEN: "eimmune_token",
    USER: "eimmune_user",
  },
};
