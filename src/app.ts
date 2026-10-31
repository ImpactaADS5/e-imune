import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import path from "path";
import type { CampaignRepo } from "./repositories/campaign.repository";
import type { ClinicRepo } from "./repositories/clinic.repository";
import type { ReminderRepo } from "./repositories/reminder.repository";
import type { VaccineRecordRepo } from "./repositories/vaccine-record.repository";
import { createCampaignRouter } from "./routes/campaign.routes";
import { createClinicRouter } from "./routes/clinic.routes";
import { createReminderRouter } from "./routes/reminder.routes";
import { createVaccineRecordRouter } from "./routes/vaccine-record.routes";

dotenv.config();

export interface AppRepos {
  vaccineRecord: VaccineRecordRepo;
  reminder?: ReminderRepo;
  campaign?: CampaignRepo;
  clinic?: ClinicRepo;
}

/** Aceita só o repo de registros (formato antigo) ou o conjunto completo. */
export function createApp(repos: VaccineRecordRepo | AppRepos) {
  const r: AppRepos = "vaccineRecord" in repos ? repos : { vaccineRecord: repos };
  const app = express();

  app.use(express.json());

  // API — monte aqui também os routers do time (auth, vaccines, POST/GET lista de records).
  // Os routers abaixo têm rotas fixas (/summary, /due, /featured...) e devem vir ANTES de qualquer GET /:id genérico.
  app.use("/api/vaccine-records", createVaccineRecordRouter(r.vaccineRecord));
  if (r.reminder) app.use("/api/reminders", createReminderRouter(r.reminder));
  if (r.campaign) app.use("/api/campaigns", createCampaignRouter(r.campaign));
  if (r.clinic) app.use("/api/clinics", createClinicRouter(r.clinic));

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
  Promise.all([
    import("./repositories/prisma-vaccine-record.repo"),
    import("./repositories/prisma-reminder.repo"),
    import("./repositories/prisma-campaign.repo"),
    import("./repositories/prisma-clinic.repo"),
  ]).then(([rec, rem, cam, cli]) => {
    createApp({
      vaccineRecord: rec.prismaVaccineRecordRepo,
      reminder: rem.prismaReminderRepo,
      campaign: cam.prismaCampaignRepo,
      clinic: cli.prismaClinicRepo,
    }).listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  });
}
