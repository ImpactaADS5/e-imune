/**
 * Dados de EXEMPLO para testar campanhas em destaque e clínicas próximas.
 * São dados de teste (nomes e telefones inventados). Em produção, cadastre os reais.
 *
 * Rodar:  npx tsx prisma/seed-ph.ts
 */
import { PrismaClient } from "@prisma/client";
import { addDays, todayISO, toDate } from "../src/lib/dates";

const prisma = new PrismaClient();

async function main() {
  const hoje = todayISO();

  await prisma.campaign.createMany({
    data: [
      {
        titulo: "Campanha de Influenza (exemplo)",
        descricao: "Dados de teste: vacinação contra gripe para grupos prioritários.",
        publicoAlvo: "Idosos e crianças",
        inicio: toDate(addDays(hoje, -10)),
        fim: toDate(addDays(hoje, 20)),
        destaque: true,
      },
      {
        titulo: "Multivacinação (exemplo)",
        descricao: "Dados de teste: atualização da caderneta de vacinação.",
        publicoAlvo: "Crianças e adolescentes",
        inicio: toDate(addDays(hoje, -2)),
        fim: toDate(addDays(hoje, 5)),
        destaque: true,
      },
      {
        titulo: "Campanha antiga (exemplo)",
        descricao: "Dados de teste: já terminou, não deve aparecer no destaque.",
        inicio: toDate(addDays(hoje, -60)),
        fim: toDate(addDays(hoje, -30)),
        destaque: true,
      },
    ],
  });

  // Coordenadas em torno de Taboão da Serra/SP (apenas para teste de distância)
  await prisma.clinic.createMany({
    data: [
      { nome: "Clínica Exemplo Centro (teste)", endereco: "Rua Exemplo, 100", cidade: "Taboão da Serra", uf: "SP", telefone: "(11) 0000-0001", latitude: -23.6086, longitude: -46.7917 },
      { nome: "UBS Exemplo Jardim (teste)", endereco: "Av. Exemplo, 200", cidade: "Taboão da Serra", uf: "SP", telefone: "(11) 0000-0002", latitude: -23.6275, longitude: -46.7701 },
      { nome: "Clínica Exemplo São Paulo (teste)", endereco: "Rua Exemplo, 300", cidade: "São Paulo", uf: "SP", telefone: null, latitude: -23.5505, longitude: -46.6333 },
    ],
  });

  console.log("Seed de exemplo criado (campanhas e clínicas).");
}

main().finally(() => prisma.$disconnect());
