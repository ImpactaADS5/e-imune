/**
 * Wrapper de requisições HTTP.
 *
 * Quando window.API_CONFIG.MOCK_MODE === true, nenhuma chamada de rede é
 * feita: as respostas vêm de um "banco de dados" falso em localStorage
 * (ver bloco MOCK no final do arquivo). A interface (Api.get/post/del) é
 * exatamente a mesma nos dois modos — as páginas não sabem a diferença.
 * Quando o back-end estiver pronto, basta trocar MOCK_MODE para false em
 * config.js.
 */
const Api = (() => {
  const { BASE_URL, STORAGE_KEYS, MOCK_MODE } = window.API_CONFIG;

  class ApiError extends Error {
    constructor(message, status, data) {
      super(message);
      this.status = status;
      this.data = data;
    }
  }

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
    if (MOCK_MODE) return mockRequest(path, method, body);

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

  /* ======================================================================
     MOCK — simula a API em localStorage. Remover este bloco (e a chamada
     acima) quando não precisar mais do modo de demonstração.
     ====================================================================== */
  const MOCK_DELAY = 350;
  const SEED_VERSION = "v2";
  const DB_KEYS = { VACCINES: "eimmune_mock_vaccines", RECORDS: "eimmune_mock_records", SEEDED: "eimmune_mock_seeded" };

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function uid() {
    return "id-" + Math.random().toString(36).slice(2, 10);
  }

  function readDb(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  }

  function writeDb(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /* ---- Datas (mesma lógica do back-end: dia de calendário, fuso de São Paulo) ---- */
  function mockToday() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
  }
  function addDays(iso, n) {
    const d = new Date(iso + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function diffDays(fromISO, toISO) {
    return Math.round((Date.parse(toISO + "T00:00:00Z") - Date.parse(fromISO + "T00:00:00Z")) / 86400000);
  }
  function isValidISODate(v) {
    if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(v + "T00:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }

  function seedIfNeeded() {
    if (localStorage.getItem(DB_KEYS.SEEDED) === SEED_VERSION) return;

    // Datas relativas a "hoje" para a demonstração sempre mostrar os 4 badges.
    const t = mockToday();

    writeDb(DB_KEYS.VACCINES, [
      { id: "v1", nome: "Febre Amarela", fabricante: "Bio-Manguinhos", dosesRecomendadas: 2 },
      { id: "v2", nome: "Hepatite B", fabricante: "Instituto Butantan", dosesRecomendadas: 3 },
      { id: "v3", nome: "Influenza (Gripe)", fabricante: "Sanofi", dosesRecomendadas: 1 },
      { id: "v4", nome: "Dupla Adulto (dT)", fabricante: "Instituto Butantan", dosesRecomendadas: 3 },
    ]);

    writeDb(DB_KEYS.RECORDS, [
      { id: "r1", vaccineId: "v1", vaccineNome: "Febre Amarela", dose: "1ª Dose",
        dataAplicacao: addDays(t, -120), proximaDose: addDays(t, 4),
        local: "UBS Centro", lote: "FA2210", observacoes: null },
      { id: "r2", vaccineId: "v2", vaccineNome: "Hepatite B", dose: "1ª Dose",
        dataAplicacao: addDays(t, -60), proximaDose: addDays(t, 20),
        local: "UBS Centro", lote: "LB2201", observacoes: null },
      { id: "r3", vaccineId: "v3", vaccineNome: "Influenza (Gripe)", dose: "Dose única",
        dataAplicacao: addDays(t, -400), proximaDose: addDays(t, -10),
        local: null, lote: null, observacoes: "Reforço anual" },
      { id: "r4", vaccineId: "v4", vaccineNome: "Dupla Adulto (dT)", dose: "2ª Dose",
        dataAplicacao: addDays(t, -300), proximaDose: addDays(t, 200),
        local: null, lote: null, observacoes: null },
    ]);

    localStorage.setItem(DB_KEYS.SEEDED, SEED_VERSION);
  }

  /* ---- Regras de negócio (espelho de src/services/* do back-end) ---- */
  function validateRecord(body) {
    const today = mockToday();
    const errors = {};
    const b = body || {};
    const clean = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

    if (!clean(b.vaccineId)) errors.vaccineId = "Selecione a vacina.";

    let dataAplicacao = "";
    if (!b.dataAplicacao) errors.dataAplicacao = "Informe a data da aplicação.";
    else if (!isValidISODate(b.dataAplicacao)) errors.dataAplicacao = "Data inválida.";
    else if (b.dataAplicacao > today) errors.dataAplicacao = "A data da aplicação não pode ser futura.";
    else dataAplicacao = b.dataAplicacao;

    let proximaDose = null;
    if (b.proximaDose) {
      if (!isValidISODate(b.proximaDose)) errors.proximaDose = "Data da próxima dose inválida.";
      else if (dataAplicacao && b.proximaDose <= dataAplicacao)
        errors.proximaDose = "A próxima dose deve ser depois da data de aplicação.";
      else proximaDose = b.proximaDose;
    }

    const observacoes = clean(b.observacoes);
    if (observacoes && observacoes.length > 200) errors.observacoes = "Máximo de 200 caracteres.";

    if (Object.keys(errors).length) throw new ApiError("Dados inválidos.", 400, { errors });

    const vaccine = readDb(DB_KEYS.VACCINES).find((v) => v.id === b.vaccineId);
    if (!vaccine) throw new ApiError("Dados inválidos.", 400, { errors: { vaccineId: "Vacina não encontrada." } });

    return {
      vaccineId: b.vaccineId, vaccineNome: vaccine.nome, dose: clean(b.dose),
      dataAplicacao, proximaDose, local: clean(b.local), lote: clean(b.lote), observacoes,
    };
  }

  function statusFromDays(d) {
    if (d < 0) return "OVERDUE";
    if (d <= 7) return "DUE_SOON";
    if (d <= 30) return "UPCOMING";
    return "SCHEDULED";
  }

  function nextDoseLabel(dose) {
    const m = typeof dose === "string" ? dose.match(/(\d+)/) : null;
    return m ? `${Number(m[1]) + 1}ª dose` : "Próxima dose";
  }

  function calcNextDoses(records, today) {
    const latest = new Map();
    records.forEach((r) => {
      const cur = latest.get(r.vaccineId);
      if (!cur || r.dataAplicacao >= cur.dataAplicacao) latest.set(r.vaccineId, r);
    });
    return [...latest.values()]
      .filter((r) => r.proximaDose)
      .map((r) => {
        const diasRestantes = diffDays(today, r.proximaDose);
        return {
          recordId: r.id, vaccineId: r.vaccineId, vaccineNome: r.vaccineNome,
          doseLabel: nextDoseLabel(r.dose), dataPrevista: r.proximaDose,
          diasRestantes, status: statusFromDays(diasRestantes),
        };
      })
      .sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));
  }

  function calcSummary(vaccines, records, today) {
    const counts = new Map();
    records.forEach((r) => counts.set(r.vaccineId, (counts.get(r.vaccineId) || 0) + 1));
    let expectedDoses = 0, appliedDoses = 0;
    vaccines.forEach((v) => {
      const expected = v.dosesRecomendadas > 0 ? v.dosesRecomendadas : 1;
      expectedDoses += expected;
      appliedDoses += Math.min(counts.get(v.id) || 0, expected);
    });
    const percent = expectedDoses === 0 ? 0 : Math.round((appliedDoses / expectedDoses) * 100);
    const nextDoses = calcNextDoses(records, today);
    return {
      percent, appliedDoses, expectedDoses,
      message: percent >= 80 ? "Excelente progresso!" : percent >= 40 ? "Bom progresso!" : "Vamos começar!",
      totalRecords: records.length,
      overdueCount: nextDoses.filter((d) => d.status === "OVERDUE").length,
      nextDose: nextDoses[0] || null,
      disclaimer: "Calculado apenas com os registros feitos no e-Immune. Não comprova que o calendário vacinal oficial está completo.",
    };
  }

  async function mockRequest(path, method, body) {
    seedIfNeeded();
    await delay(MOCK_DELAY);

    // ---- Autenticação -----------------------------------------------
    if (path === "/auth/login" && method === "POST") {
      const email = (body.email || "").trim().toLowerCase();
      const isAdminTest = email === "admin" || email === "admin@eimmune.com";
      if (isAdminTest && body.senha === "admin") {
        return {
          token: "mock-token-" + uid(),
          user: { id: "u1", nome: "Maria Eduarda", email: "admin@eimmune.com" },
        };
      }
      throw new ApiError("E-mail ou senha inválidos.", 401);
    }

    if (path === "/auth/register" && method === "POST") {
      const email = (body.email || "").trim().toLowerCase();
      if (email === "existente@teste.com") {
        throw new ApiError("Este e-mail já possui um cadastro.", 409);
      }
      return { id: uid(), nome: body.nome, email: body.email };
    }

    if (path === "/users/me" && method === "GET") {
      return getUser() || { id: "u1", nome: "Maria Eduarda", email: "admin@eimmune.com" };
    }

    // ---- Vaccine (catálogo) ------------------------------------------
    if (path === "/vaccines" && method === "GET") {
      return readDb(DB_KEYS.VACCINES);
    }
    if (path === "/vaccines" && method === "POST") {
      const vaccines = readDb(DB_KEYS.VACCINES);
      const created = { id: uid(), ...body };
      vaccines.push(created);
      writeDb(DB_KEYS.VACCINES, vaccines);
      return created;
    }
    const vaccineDeleteMatch = path.match(/^\/vaccines\/([^/]+)$/);
    if (vaccineDeleteMatch && method === "DELETE") {
      const vaccines = readDb(DB_KEYS.VACCINES).filter((v) => v.id !== vaccineDeleteMatch[1]);
      writeDb(DB_KEYS.VACCINES, vaccines);
      return { success: true };
    }

    // ---- VaccineRecord (registros do usuário) ------------------------
    // ATENÇÃO: /summary e /next-doses vêm ANTES de /:id (mesma ordem do back-end)
    if (path === "/vaccine-records/summary" && method === "GET") {
      return calcSummary(readDb(DB_KEYS.VACCINES), readDb(DB_KEYS.RECORDS), mockToday());
    }
    if (path === "/vaccine-records/next-doses" && method === "GET") {
      return calcNextDoses(readDb(DB_KEYS.RECORDS), mockToday());
    }
    if (path === "/vaccine-records" && method === "GET") {
      return readDb(DB_KEYS.RECORDS);
    }
    if (path === "/vaccine-records" && method === "POST") {
      const data = validateRecord(body);
      const records = readDb(DB_KEYS.RECORDS);
      const created = { id: uid(), ...data };
      records.push(created);
      writeDb(DB_KEYS.RECORDS, records);
      return created;
    }
    const recordIdMatch = path.match(/^\/vaccine-records\/([^/]+)$/);
    if (recordIdMatch) {
      const id = recordIdMatch[1];
      const records = readDb(DB_KEYS.RECORDS);
      const index = records.findIndex((r) => r.id === id);
      if (index === -1) throw new ApiError("Registro não encontrado.", 404);

      if (method === "GET") return records[index];
      if (method === "PUT") {
        records[index] = { id, ...validateRecord(body) };
        writeDb(DB_KEYS.RECORDS, records);
        return records[index];
      }
      if (method === "DELETE") {
        writeDb(DB_KEYS.RECORDS, records.filter((r) => r.id !== id));
        return { success: true };
      }
    }

    throw new ApiError(`Rota mock não implementada: ${method} ${path}`, 404);
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
