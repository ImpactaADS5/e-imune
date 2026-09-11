import dotenv from "dotenv";
import app from "./app";

// Carrega as configurações do arquivo .env
dotenv.config();

const PORT = process.env.PORT || 3000;

// O server.ts tem uma única função: colocar o servidor no ar
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
