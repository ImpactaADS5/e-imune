import "dotenv/config";
import { createApp } from "./app";
import { env } from "./config/env";
import log from "./lib/log";
import { prismaVaccineRecordRepo } from "./repositories/prisma-vaccine-record.repo";

// O server.ts tem uma única função: colocar o servidor no ar
const app = createApp(prismaVaccineRecordRepo);
app.listen(env.PORT, () => {
  log.info({ port: env.PORT, environment: process.env.NODE_ENV || "development" }, "Servidor iniciado e aguardando requisições.");
});
