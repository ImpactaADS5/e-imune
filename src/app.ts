import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";

// Importe a rota da vacina aqui
import vaccineRoutes from "./modules/vaccine/vaccine.routes";

const app = express();

// Configurações e segurança
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Registre a rota no Express
app.use("/vaccine", vaccineRoutes);

// Rota padrão para testar se a API está no ar
app.get("/", (req, res) => {
  res.status(200).send("Hello, World!");
});

// Apenas exporta o app (NÃO usa app.listen aqui)
export default app;
