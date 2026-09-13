import "dotenv/config";
import app from "./app";
import { env } from "./config/env";
import log from "./lib/log";

// O server.ts tem uma única função: colocar o servidor no ar
app.listen(env.PORT, () => {
  log.info({ port: env.PORT, environment: process.env.NODE_ENV || "development" }, "Servidor iniciado e aguardando requisições.");
});
