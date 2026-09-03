import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import helmet from "helmet";
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  app.use(express.static(path.join(__dirname, "..", "public/pages")));

  // app.use("/auth", authRoutes);

  app.get("/", (req, res) => {
    res.status(200).send("Hello, World!");
  });

  app.use(helmet());
  app.use(cors());

  app.use(express.static(path.join(__dirname, "..", "public")));

  app.get("/", (req, res) => {
    res.status(200).send("Hello, World!");
  });

  const server = app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });

  return server;
}

const server = startServer();

export default server;
