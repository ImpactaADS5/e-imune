import { hash } from "bcrypt";
import { prisma } from "../src/lib/prisma";

const BCRYPT_ROUNDS = 12;

const IDS = {
  admin: "11111111-1111-4111-8111-111111111111",
  user: "22222222-2222-4222-8222-222222222222",
  vaccines: {
    covid: "aaaaaaaa-1111-4111-8111-111111111111",
    influenza: "aaaaaaaa-2222-4222-8222-222222222222",
    hepatiteB: "aaaaaaaa-3333-4333-8333-333333333333",
    triplice: "aaaaaaaa-4444-4444-8444-444444444444",
    febreAmarela: "aaaaaaaa-5555-4555-8555-555555555555",
    hpv: "aaaaaaaa-6666-4666-8666-666666666666",
  },
  campaigns: {
    influenza: "bbbbbbbb-1111-4111-8111-111111111111",
    multivacinacao: "bbbbbbbb-2222-4222-8222-222222222222",
    hpv: "bbbbbbbb-3333-4333-8333-333333333333",
  },
  clinics: {
    hc: "cccccccc-1111-4111-8111-111111111111",
    butantan: "cccccccc-2222-4222-8222-222222222222",
    santaCasa: "cccccccc-3333-4333-8333-333333333333",
    unifesp: "cccccccc-4444-4444-8444-444444444444",
    einstein: "cccccccc-5555-4555-8555-555555555555",
  },
} as const;

function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

async function clearDevData() {
  await prisma.passwordResetToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.vaccineRecord.deleteMany();
  await prisma.campaignVaccines.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.clinic.deleteMany();
  await prisma.vaccine.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers() {
  const [adminHash, userHash] = await Promise.all([
    hash("Admin123!", BCRYPT_ROUNDS),
    hash("User123!", BCRYPT_ROUNDS),
  ]);

  const admin = await prisma.user.create({
    data: {
      id: IDS.admin,
      email: "admin@eimune.test",
      passwordHash: adminHash,
      nome: "Ana Admin",
      role: "ADMIN",
      twoFactorEnabled: false,
    },
  });

  const user = await prisma.user.create({
    data: {
      id: IDS.user,
      email: "user@eimune.test",
      passwordHash: userHash,
      nome: "João Paciente",
      cpf: "39053344705",
      telefone: "11987654321",
      dataNascimento: new Date("1996-03-12T12:00:00.000Z"),
      role: "USER",
      twoFactorEnabled: false,
    },
  });

  return { admin, user };
}

async function seedVaccines() {
  await prisma.vaccine.createMany({
    data: [
      {
        id: IDS.vaccines.covid,
        nome: "COVID-19",
        fabricante: "Pfizer",
        dosesNecessarias: 2,
        intervaloDias: 28,
        descricao: "Esquema primário de 2 doses, intervalo de 28 dias.",
      },
      {
        id: IDS.vaccines.influenza,
        nome: "Influenza",
        fabricante: "Instituto Butantan",
        dosesNecessarias: 1,
        intervaloDias: 365,
        descricao: "Dose anual da campanha de gripe.",
      },
      {
        id: IDS.vaccines.hepatiteB,
        nome: "Hepatite B",
        fabricante: "Fiocruz",
        dosesNecessarias: 3,
        intervaloDias: 30,
        descricao: "Esquema 0-1-6 meses. Intervalo base de 30 dias entre as primeiras doses.",
      },
      {
        id: IDS.vaccines.triplice,
        nome: "Tríplice Viral",
        fabricante: "Fiocruz",
        dosesNecessarias: 2,
        intervaloDias: 30,
        descricao: "Sarampo, caxumba e rubéola. Duas doses.",
      },
      {
        id: IDS.vaccines.febreAmarela,
        nome: "Febre Amarela",
        fabricante: "Bio-Manguinhos",
        dosesNecessarias: 1,
        intervaloDias: 3650,
        descricao: "Dose única na rotina do Calendário Nacional.",
      },
      {
        id: IDS.vaccines.hpv,
        nome: "HPV",
        fabricante: "MSD",
        dosesNecessarias: 2,
        intervaloDias: 180,
        descricao: "Duas doses com intervalo de 6 meses (9 a 14 anos).",
      },
    ],
  });
}

async function seedCampaigns() {
  await prisma.campaign.create({
    data: {
      id: IDS.campaigns.influenza,
      titulo: "Campanha Nacional de Influenza 2026",
      descricao: "Vacinação contra a gripe para grupos prioritários na capital.",
      destaque: true,
      dataInicio: new Date("2026-04-01T00:00:00.000Z"),
      dataFim: new Date("2026-07-31T23:59:59.000Z"),
      vaccines: {
        create: [{ vaccineId: IDS.vaccines.influenza }],
      },
    },
  });

  await prisma.campaign.create({
    data: {
      id: IDS.campaigns.multivacinacao,
      titulo: "Multivacinação infantil",
      descricao: "Atualização da caderneta: Tríplice Viral, Hepatite B e Febre Amarela.",
      destaque: false,
      dataInicio: new Date("2026-03-01T00:00:00.000Z"),
      dataFim: new Date("2026-12-15T23:59:59.000Z"),
      vaccines: {
        create: [
          { vaccineId: IDS.vaccines.triplice },
          { vaccineId: IDS.vaccines.hepatiteB },
          { vaccineId: IDS.vaccines.febreAmarela },
        ],
      },
    },
  });

  await prisma.campaign.create({
    data: {
      id: IDS.campaigns.hpv,
      titulo: "HPV nas escolas",
      descricao: "Vacinação de adolescentes em unidades da rede municipal.",
      destaque: false,
      dataInicio: new Date("2026-02-15T00:00:00.000Z"),
      dataFim: new Date("2026-11-30T23:59:59.000Z"),
      vaccines: {
        create: [{ vaccineId: IDS.vaccines.hpv }],
      },
    },
  });
}

async function seedClinics() {
  await prisma.clinic.createMany({
    data: [
      {
        id: IDS.clinics.hc,
        nome: "Hospital das Clínicas — Centro de Imunização",
        endereco: "Av. Dr. Enéas Carvalho de Aguiar, 255",
        cidade: "São Paulo",
        estado: "SP",
        cep: "05403000",
        latitude: -23.5573,
        longitude: -46.6689,
        telefone: "1130912000",
        horario: "07:00-17:00",
      },
      {
        id: IDS.clinics.butantan,
        nome: "Instituto Butantan — Ambulatório",
        endereco: "Av. Vital Brasil, 1500",
        cidade: "São Paulo",
        estado: "SP",
        cep: "05503000",
        latitude: -23.5672,
        longitude: -46.7181,
        telefone: "1137267222",
        horario: "08:00-16:00",
      },
      {
        id: IDS.clinics.santaCasa,
        nome: "Santa Casa de Misericórdia de São Paulo",
        endereco: "Rua Dr. Cesário Mota Júnior, 112",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01221020",
        latitude: -23.5436,
        longitude: -46.6498,
        telefone: "1121767000",
        horario: "08:00-17:00",
      },
      {
        id: IDS.clinics.unifesp,
        nome: "Hospital São Paulo — UNIFESP",
        endereco: "Rua Napoleão de Barros, 715",
        cidade: "São Paulo",
        estado: "SP",
        cep: "04024002",
        latitude: -23.5981,
        longitude: -46.6437,
        telefone: "1155764000",
        horario: "07:00-18:00",
      },
      {
        id: IDS.clinics.einstein,
        nome: "Hospital Israelita Albert Einstein",
        endereco: "Av. Albert Einstein, 627",
        cidade: "São Paulo",
        estado: "SP",
        cep: "05652900",
        latitude: -23.6001,
        longitude: -46.7154,
        telefone: "1121511233",
        horario: "08:00-20:00",
      },
    ],
  });
}

async function seedRecords(userId: string) {
  // 2 séries completas, 1 atrasada, 1 próxima — cenário do S3a.
  await prisma.vaccineRecord.createMany({
    data: [
      {
        userId,
        vaccineId: IDS.vaccines.influenza,
        numeroDose: 1,
        dataAplicacao: daysAgo(80),
        dataProximaDose: null,
        lote: "FLU26A01",
        local: "Hospital das Clínicas — Centro de Imunização",
      },
      {
        userId,
        vaccineId: IDS.vaccines.febreAmarela,
        numeroDose: 1,
        dataAplicacao: daysAgo(800),
        dataProximaDose: null,
        lote: "FA24B12",
        local: "Instituto Butantan — Ambulatório",
      },
      {
        userId,
        vaccineId: IDS.vaccines.hepatiteB,
        numeroDose: 1,
        dataAplicacao: daysAgo(90),
        dataProximaDose: daysAgo(60),
        lote: "HBV25C08",
        local: "Santa Casa de Misericórdia de São Paulo",
      },
      {
        userId,
        vaccineId: IDS.vaccines.covid,
        numeroDose: 1,
        dataAplicacao: daysAgo(10),
        dataProximaDose: daysFromNow(18),
        lote: "PZ2603X",
        local: "Hospital São Paulo — UNIFESP",
      },
    ],
  });
}

async function main() {
  await clearDevData();
  const { admin, user } = await seedUsers();
  await seedVaccines();
  await seedCampaigns();
  await seedClinics();
  await seedRecords(user.id);

  console.log("Seed ok:");
  console.log(`  admin  ${admin.email} / Admin123!`);
  console.log(`  user   ${user.email} / User123!`);
  console.log("  6 vacinas, 3 campanhas, 5 clínicas, 4 registros do user");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
