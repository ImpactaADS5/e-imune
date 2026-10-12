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
  MOCK_MODE: false,
  BASE_URL: "/api", // mesma origem do Express (porta 3000). Se a API ficar em outra porta, use a URL completa.
  ENDPOINTS: {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    ME: "/users/me",
    VACCINES: "/vaccines",
    VACCINE_RECORDS: "/vaccine-records",
    VACCINE_RECORDS_SUMMARY: "/vaccine-records/summary",
    NEXT_DOSES: "/vaccine-records/next-doses",
  },
  STORAGE_KEYS: {
    TOKEN: "eimmune_token",
    USER: "eimmune_user",
  },
};
