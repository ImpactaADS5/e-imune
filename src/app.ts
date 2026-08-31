import express from "express";
import dotenv from "dotenv";
import path from "path";
import authRoutes from "./auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.status(200).send("Hello, World!");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});