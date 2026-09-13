import "dotenv/config";
import app from "./app";
import { env } from "./config/env";

// O server.ts tem uma única função: colocar o servidor no ar
app.listen(env.PORT, () => {
  console.log(`Servidor rodando na porta ${env.PORT}`);
});
