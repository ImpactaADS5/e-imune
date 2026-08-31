import express from "express";
import dotenv from "dotenv";
import server from "./server";

dotenv.config();

server
  .then((app) => {
    console.log(`Servidor chamado`);
  })
  .catch((error) => {
    console.error("Erro ao iniciar o servidor:", error);
    process.exit(1);
  });
