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
  const SEED_VERSION = "v3";
  const DB_KEYS = {
    VACCINES: "eimmune_mock_vaccines",
    RECORDS: "eimmune_mock_records",
    REMINDERS: "eimmune_mock_reminders",
    CAMPAIGNS: "eimmune_mock_campaigns",
    CLINICS: "eimmune_mock_clinics",
    PROFILE: "eimmune_mock_profile",
    SESSIONS: "eimmune_mock_sessions",
    SEEDED: "eimmune_mock_seeded",
  };

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

    // m1: AGENDADO (próxima dose de r1 em 4 dias, avisa 1 dia antes)
    // m2: PENDENTE (r3 está atrasada, então o aviso já deveria ter disparado)
    writeDb(DB_KEYS.REMINDERS, [
      { id: "m1", vaccineRecordId: "r1", ativo: true, antecedenciaDias: 1, horario: "09:00", ackedFor: null },
      { id: "m2", vaccineRecordId: "r3", ativo: true, antecedenciaDias: 3, horario: "08:00", ackedFor: null },
    ]);

    writeDb(DB_KEYS.CAMPAIGNS, [
      { id: "c1", titulo: "Campanha de Influenza (exemplo)", descricao: "Dados de teste: vacinação contra gripe para grupos prioritários.",
        publicoAlvo: "Idosos e crianças", inicio: addDays(t, -10), fim: addDays(t, 20), destaque: true },
      { id: "c2", titulo: "Multivacinação (exemplo)", descricao: "Dados de teste: atualização da caderneta de vacinação.",
        publicoAlvo: "Crianças e adolescentes", inicio: addDays(t, -2), fim: addDays(t, 5), destaque: true },
      { id: "c3", titulo: "Campanha antiga (exemplo)", descricao: "Dados de teste: já terminou, não aparece no destaque.",
        publicoAlvo: null, inicio: addDays(t, -60), fim: addDays(t, -30), destaque: true },
    ]);

    // Coordenadas em torno de Taboão da Serra/SP. Nomes e telefones são de teste.
    writeDb(DB_KEYS.CLINICS, [
      { id: "k1", nome: "Clínica Exemplo Centro (teste)", endereco: "Rua Exemplo, 100", cidade: "Taboão da Serra", uf: "SP", telefone: "(11) 0000-0001", latitude: -23.6086, longitude: -46.7917 },
      { id: "k2", nome: "UBS Exemplo Jardim (teste)", endereco: "Av. Exemplo, 200", cidade: "Taboão da Serra", uf: "SP", telefone: "(11) 0000-0002", latitude: -23.6275, longitude: -46.7701 },
      { id: "k3", nome: "Clínica Exemplo São Paulo (teste)", endereco: "Rua Exemplo, 300", cidade: "São Paulo", uf: "SP", telefone: null, latitude: -23.5505, longitude: -46.6333 },
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


  /* ---- Lembretes (espelho de reminder.service / reminder.validation) ---- */
  const SP_OFFSET = "-03:00"; // Brasil sem horário de verão desde 2019

  function calcDisparoEm(proximaDose, antecedenciaDias, horario) {
    return `${addDays(proximaDose, -antecedenciaDias)}T${horario}:00${SP_OFFSET}`;
  }

  /** Junta o lembrete com os dados do registro e calcula disparo e status. */
  function toReminderView(rem, records) {
    const rec = records.find((r) => r.id === rem.vaccineRecordId);
    const proximaDose = rec ? rec.proximaDose : null;
    const disparoEm = proximaDose ? calcDisparoEm(proximaDose, rem.antecedenciaDias, rem.horario) : null;
    let status;
    if (!rem.ativo) status = "DESATIVADO";
    else if (!disparoEm) status = "SEM_DATA";
    else if (rem.ackedFor === disparoEm) status = "LIDO";
    else if (Date.parse(disparoEm) <= Date.now()) status = "PENDENTE";
    else status = "AGENDADO";
    return {
      id: rem.id, vaccineRecordId: rem.vaccineRecordId,
      vaccineNome: rec ? rec.vaccineNome : "",
      doseLabel: nextDoseLabel(rec ? rec.dose : null),
      dataPrevista: proximaDose, ativo: rem.ativo,
      antecedenciaDias: rem.antecedenciaDias, horario: rem.horario, disparoEm, status,
    };
  }

  function readReminderFields(b, errors) {
    const value = {};
    if (b.ativo !== undefined) {
      if (typeof b.ativo === "boolean") value.ativo = b.ativo;
      else errors.ativo = "Informe se o lembrete está ativo (true ou false).";
    }
    if (b.antecedenciaDias !== undefined) {
      const raw = typeof b.antecedenciaDias === "string" && /^\d+$/.test(b.antecedenciaDias.trim())
        ? Number(b.antecedenciaDias) : b.antecedenciaDias;
      if (Number.isInteger(raw) && raw >= 0 && raw <= 30) value.antecedenciaDias = raw;
      else errors.antecedenciaDias = "A antecedência deve ser um número inteiro de 0 a 30 dias.";
    }
    if (b.horario !== undefined) {
      if (typeof b.horario === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(b.horario)) value.horario = b.horario;
      else errors.horario = "Horário inválido. Use o formato HH:mm (ex.: 09:00).";
    }
    return value;
  }

  /* ---- Campanhas e clínicas ---- */
  function haversineKm(lat1, lng1, lat2, lng2) {
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  function numParam(v) {
    return v === undefined || v === "" ? undefined : Number(v);
  }

  async function mockRequest(fullPath, method, body) {
    seedIfNeeded();
    await delay(MOCK_DELAY);

    // separa "/caminho?a=1&b=2" em caminho + parâmetros
    const [path, queryString = ""] = fullPath.split("?");
    const query = Object.fromEntries(new URLSearchParams(queryString));

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

    // ---- Perfil (AC3) -------------------------------------------------
    // Contrato proposto pelo front para as telas de Perfil; alinhar com o
    // back-end (Aylon) antes de desligar o MOCK_MODE.
    if (path.startsWith("/users/me") || path.startsWith("/auth/sessions") || path === "/auth/logout") {
      return mockProfileRequest(path, method, body || {});
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
        // mesma regra do back-end: os lembretes do registro saem junto (FK)
        const reminders = readDb(DB_KEYS.REMINDERS);
        const remaining = reminders.filter((m) => m.vaccineRecordId !== id);
        writeDb(DB_KEYS.REMINDERS, remaining);
        writeDb(DB_KEYS.RECORDS, records.filter((r) => r.id !== id));
        return { deleted: true, removedReminders: reminders.length - remaining.length };
      }
    }

    // ---- Lembretes ----------------------------------------------------
    // ATENÇÃO: /due vem ANTES de /:id (mesma ordem do back-end)
    if (path === "/reminders" && method === "GET") {
      const records = readDb(DB_KEYS.RECORDS);
      return readDb(DB_KEYS.REMINDERS).map((m) => toReminderView(m, records));
    }
    if (path === "/reminders/due" && method === "GET") {
      const records = readDb(DB_KEYS.RECORDS);
      return readDb(DB_KEYS.REMINDERS)
        .map((m) => toReminderView(m, records))
        .filter((v) => v.status === "PENDENTE")
        .sort((a, b) => a.disparoEm.localeCompare(b.disparoEm));
    }
    if (path === "/reminders" && method === "POST") {
      const b = body || {};
      const errors = {};
      const vaccineRecordId = typeof b.vaccineRecordId === "string" ? b.vaccineRecordId.trim() : "";
      if (!vaccineRecordId) errors.vaccineRecordId = "Selecione o registro de vacina.";
      const fields = readReminderFields(b, errors);
      if (Object.keys(errors).length) throw new ApiError("Dados inválidos.", 400, { errors });

      const records = readDb(DB_KEYS.RECORDS);
      const rec = records.find((r) => r.id === vaccineRecordId);
      if (!rec) throw new ApiError("Registro não encontrado.", 404);
      if (!rec.proximaDose) {
        throw new ApiError("Dados inválidos.", 400, {
          errors: { vaccineRecordId: "Este registro não tem data de próxima dose. Edite o registro e informe a data." },
        });
      }
      const reminders = readDb(DB_KEYS.REMINDERS);
      if (reminders.some((m) => m.vaccineRecordId === vaccineRecordId)) {
        throw new ApiError("Já existe um lembrete para este registro.", 409);
      }
      const created = { id: uid(), vaccineRecordId, ativo: true, antecedenciaDias: 1, horario: "09:00", ackedFor: null, ...fields };
      reminders.push(created);
      writeDb(DB_KEYS.REMINDERS, reminders);
      return toReminderView(created, records);
    }
    const reminderAckMatch = path.match(/^\/reminders\/([^/]+)\/ack$/);
    if (reminderAckMatch && method === "POST") {
      const reminders = readDb(DB_KEYS.REMINDERS);
      const rem = reminders.find((m) => m.id === reminderAckMatch[1]);
      if (!rem) throw new ApiError("Lembrete não encontrado.", 404);
      const records = readDb(DB_KEYS.RECORDS);
      const view = toReminderView(rem, records);
      if (!view.disparoEm) throw new ApiError("Este lembrete não tem data de disparo.", 400);
      rem.ackedFor = view.disparoEm;
      writeDb(DB_KEYS.REMINDERS, reminders);
      return toReminderView(rem, records);
    }
    const reminderIdMatch = path.match(/^\/reminders\/([^/]+)$/);
    if (reminderIdMatch) {
      const id = reminderIdMatch[1];
      const reminders = readDb(DB_KEYS.REMINDERS);
      const index = reminders.findIndex((m) => m.id === id);
      if (index === -1) throw new ApiError("Lembrete não encontrado.", 404);
      const records = readDb(DB_KEYS.RECORDS);

      if (method === "GET") return toReminderView(reminders[index], records);
      if (method === "PUT") {
        const errors = {};
        const value = readReminderFields(body || {}, errors);
        if (!Object.keys(errors).length && !Object.keys(value).length) {
          errors._ = "Informe ao menos um campo para atualizar (ativo, antecedenciaDias ou horario).";
        }
        if (Object.keys(errors).length) throw new ApiError(errors._ || "Dados inválidos.", 400, { errors });
        Object.assign(reminders[index], value);
        writeDb(DB_KEYS.REMINDERS, reminders);
        return toReminderView(reminders[index], records);
      }
      if (method === "DELETE") {
        writeDb(DB_KEYS.REMINDERS, reminders.filter((m) => m.id !== id));
        return null; // o back-end responde 204 (sem corpo)
      }
    }

    // ---- Campanhas em destaque ---------------------------------------
    if (path === "/campaigns/featured" && method === "GET") {
      let limit = 5;
      if (query.limit !== undefined && query.limit !== "") {
        limit = Number(query.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
          const msg = "O limite deve ser um inteiro de 1 a 10.";
          throw new ApiError(msg, 400, { message: msg, errors: { limit: msg } });
        }
      }
      const today = mockToday();
      return readDb(DB_KEYS.CAMPAIGNS)
        .filter((c) => c.destaque && c.inicio <= today && c.fim >= today)
        .map((c) => ({ ...c, diasRestantes: diffDays(today, c.fim) }))
        .sort((a, b) => a.fim.localeCompare(b.fim) || a.inicio.localeCompare(b.inicio))
        .slice(0, limit);
    }

    // ---- Clínicas próximas -------------------------------------------
    if (path === "/clinics/nearby" && method === "GET") {
      const errors = {};
      const lat = numParam(query.lat), lng = numParam(query.lng);
      const raio = numParam(query.raio), limit = numParam(query.limit);
      if (lat === undefined) errors.lat = "Informe a latitude.";
      else if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.lat = "Latitude inválida (de -90 a 90).";
      if (lng === undefined) errors.lng = "Informe a longitude.";
      else if (!Number.isFinite(lng) || lng < -180 || lng > 180) errors.lng = "Longitude inválida (de -180 a 180).";
      if (raio !== undefined && (!Number.isFinite(raio) || raio <= 0 || raio > 100)) errors.raio = "O raio deve ser maior que 0 e no máximo 100 km.";
      if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 50)) errors.limit = "O limite deve ser um inteiro de 1 a 50.";
      if (Object.keys(errors).length) throw new ApiError("Parâmetros inválidos.", 400, { message: "Parâmetros inválidos.", errors });

      const radius = raio === undefined ? 10 : raio;
      return readDb(DB_KEYS.CLINICS)
        .map((c) => ({ ...c, d: haversineKm(lat, lng, c.latitude, c.longitude) }))
        .filter((c) => c.d <= radius)
        .sort((a, b) => a.d - b.d)
        .slice(0, limit === undefined ? 10 : limit)
        .map(({ d, ...c }) => ({ ...c, distanciaKm: Math.round(d * 10) / 10 }));
    }

    throw new ApiError(`Rota mock não implementada: ${method} ${fullPath}`, 404);
  }

  /* ---- Perfil (AC3) ---- */
  const DEFAULT_NOTIFICATIONS = { proximasDoses: true, campanhas: true, alertas: true, dicas: false, resumoSemanal: true };

  function readProfile() {
    let profile = null;
    try { profile = JSON.parse(localStorage.getItem(DB_KEYS.PROFILE)); } catch {}
    if (!profile) {
      const u = getUser() || {};
      profile = {
        id: u.id || "u1", nome: u.nome || "Maria Eduarda", email: u.email || "admin@eimmune.com",
        telefone: null, dataNascimento: null, twoFactorEnabled: false,
        notificationPreferences: { ...DEFAULT_NOTIFICATIONS }, senha: "admin",
      };
      writeDb(DB_KEYS.PROFILE, profile);
    }
    return profile;
  }

  function publicProfile(p) {
    const { senha, ...rest } = p;
    return rest;
  }

  function readSessions() {
    let sessions = readDb(DB_KEYS.SESSIONS);
    if (!sessions.length) {
      const t = mockToday();
      sessions = [
        { id: "s1", dispositivo: "Este navegador", ip: "127.0.0.1", criadoEm: t + "T08:00:00-03:00", atual: true },
        { id: "s2", dispositivo: "Chrome · Android", ip: "200.0.0.10", criadoEm: addDays(t, -3) + "T19:30:00-03:00", atual: false },
      ];
      writeDb(DB_KEYS.SESSIONS, sessions);
    }
    return sessions;
  }

  function mockProfileRequest(path, method, body) {
    const profile = readProfile();

    if (path === "/users/me" && method === "GET") return publicProfile(profile);

    if (path === "/users/me" && method === "PUT") {
      const errors = {};
      const nome = typeof body.nome === "string" ? body.nome.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const telefone = typeof body.telefone === "string" && body.telefone.trim() ? body.telefone.trim() : null;
      const dataNascimento = body.dataNascimento || null;
      if (nome.length < 3) errors.nome = "Informe o nome completo.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Informe um e-mail válido.";
      if (email === "existente@teste.com") errors.email = "Este e-mail já está em uso.";
      if (telefone && !/^\d{10,11}$/.test(telefone.replace(/\D/g, ""))) errors.telefone = "Telefone inválido.";
      if (dataNascimento && (!isValidISODate(dataNascimento) || dataNascimento > mockToday()))
        errors.dataNascimento = "Data de nascimento inválida.";
      if (Object.keys(errors).length) throw new ApiError("Dados inválidos.", 400, { errors });
      Object.assign(profile, { nome, email, telefone, dataNascimento });
      writeDb(DB_KEYS.PROFILE, profile);
      return publicProfile(profile);
    }

    if (path === "/users/me" && method === "DELETE") {
      Object.values(DB_KEYS).forEach((k) => localStorage.removeItem(k));
      return null; // 204
    }

    if (path === "/users/me/password" && method === "PUT") {
      if (body.senhaAtual !== profile.senha) {
        throw new ApiError("Senha atual incorreta.", 400, { errors: { senhaAtual: "Senha atual incorreta." } });
      }
      if (typeof body.novaSenha !== "string" || body.novaSenha.length < 6) {
        throw new ApiError("Dados inválidos.", 400, { errors: { novaSenha: "A nova senha deve ter pelo menos 6 caracteres." } });
      }
      profile.senha = body.novaSenha;
      writeDb(DB_KEYS.PROFILE, profile);
      return null; // 204
    }

    if (path === "/users/me/2fa" && method === "PUT") {
      if (typeof body.enabled !== "boolean") throw new ApiError("Informe enabled (true ou false).", 400);
      profile.twoFactorEnabled = body.enabled;
      writeDb(DB_KEYS.PROFILE, profile);
      return { twoFactorEnabled: profile.twoFactorEnabled };
    }

    if (path === "/users/me/notification-preferences") {
      if (method === "GET") return profile.notificationPreferences;
      if (method === "PUT") {
        const prefs = { ...profile.notificationPreferences };
        for (const [key, value] of Object.entries(body)) {
          if (!(key in DEFAULT_NOTIFICATIONS) || typeof value !== "boolean") {
            throw new ApiError("Preferência inválida.", 400, { errors: { [key]: "Valor inválido." } });
          }
          prefs[key] = value;
        }
        profile.notificationPreferences = prefs;
        writeDb(DB_KEYS.PROFILE, profile);
        return prefs;
      }
    }

    if (path === "/auth/sessions" && method === "GET") return readSessions();
    const sessionMatch = path.match(/^\/auth\/sessions\/([^/]+)$/);
    if (sessionMatch && method === "DELETE") {
      const sessions = readSessions();
      const target = sessions.find((s) => s.id === sessionMatch[1]);
      if (!target) throw new ApiError("Sessão não encontrada.", 404);
      if (target.atual) throw new ApiError("Use “Sair da Conta” para encerrar a sessão atual.", 400);
      writeDb(DB_KEYS.SESSIONS, sessions.filter((s) => s.id !== target.id));
      return null; // 204
    }

    if (path === "/auth/logout" && method === "POST") return null;

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
