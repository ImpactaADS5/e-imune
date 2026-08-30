import express from "express";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve TUDO que está dentro de "public" (pages/ e assets/ juntos)
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
  res.redirect("/pages/index.html");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});