import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import log from "./lib/log";
import { requestLogger } from "./middleware/request-logger";
import authRouter from "./auth";
import vaccineRoutes from "./modules/vaccine/vaccine.routes";
import clinicRoutes from "./modules/clinic/clinic.routes";
import campaignRoutes from "./modules/campaign/campaign.routes";
import reminderRoutes from "./modules/reminder/reminder.routes";
import vaccineRecordRoutes from "./modules/vaccine-record/vaccine-record.routes";


const app = express();
// O tráfego público chega pelo Cloudflare Tunnel antes de alcançar o Express.
// Confiar no único proxy local permite ao rate limit usar o IP real do cliente.
app.set("trust proxy", 1);

// Configurações e segurança
// As páginas estáticas usam onclick=...; o default do Helmet (script-src-attr 'none')
// bloqueava o FAB de adicionar e outros botões de navegação.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src-attr": ["'unsafe-inline'"],
      },
    },
  })
);
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(requestLogger);
app.use(express.static(path.join(__dirname, "..", "public")));
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: "draft-8", legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });

app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/vaccine-records", vaccineRecordRoutes);

app.use("/api/vaccines", vaccineRoutes);
app.use("/api/clinics", clinicRoutes);
app.get("/api/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.use("/api", (req, res) => {
  log.warn({ requestId: req.requestId, method: req.method, path: req.originalUrl }, "Endpoint da API não encontrado.");
  return res.status(404).json({ error: "Endpoint não encontrado." });
});
app.use((req, res, next) => {
  if (req.path.endsWith(".html")) {
    const cleanPath = req.path.slice(0, -5) || "/";
    const query = req.url.includes("?") ? `?${req.url.split("?")[1]}` : "";
    return res.redirect(301, cleanPath + query);
  }
  next();
});
app.use(
  "/",
  express.static(path.join(__dirname, "..", "public/pages"), {
    extensions: ["html"],
  })
);
export default app;
