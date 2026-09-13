import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import log from "./log";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não definida. Confira o arquivo .env.");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const reusedClient = Boolean(globalForPrisma.prisma);

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

log.debug({ reusedClient, environment: process.env.NODE_ENV || "development" }, "Prisma: cliente de banco inicializado.");

export { prisma };
export default prisma;
