import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import path from "path";
import type { VaccineRecordRepo } from "./repositories/vaccine-record.repository";
import { createVaccineRecordRouter } from "./routes/vaccine-record.routes";

dotenv.config();

export function createApp(vaccineRecordRepo: VaccineRecordRepo) {
  const app = express();

  app.use(express.json());

  // API — monte aqui também os routers do time (auth, vaccines, POST/GET lista de records).
  // O router de vaccine-records abaixo deve vir ANTES de um GET /:id genérico.
  app.use("/api/vaccine-records", createVaccineRecordRouter(vaccineRecordRepo));

  // Front-end estático (pasta public com pages/ e assets/)
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.get("/", (_req, res) => {
    res.redirect("/pages/index.html");
  });

  // Erros inesperados viram JSON em vez de derrubar a requisição
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ message: "Erro interno do servidor." });
  });

  return app;
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  import("./repositories/prisma-vaccine-record.repo").then(({ prismaVaccineRecordRepo }) => {
    createApp(prismaVaccineRecordRepo).listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  });
}

