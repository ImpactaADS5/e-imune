import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";
import log, { sanitizeForLog } from "../lib/log";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/** Registra entrada, saída, duração e payload seguro de cada requisição HTTP. */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  log.info(
    {
      requestId,
      method: req.method,
      path: req.originalUrl,
      query: sanitizeForLog(req.query),
      body: sanitizeForLog(req.body),
    },
    "Requisição HTTP recebida: iniciando processamento."
  );

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    log.info(
      { requestId, method: req.method, path: req.originalUrl, statusCode: res.statusCode, durationMs: Math.round(durationMs * 100) / 100 },
      "Requisição HTTP concluída: resposta enviada."
    );
  });

  res.on("close", () => {
    if (!res.writableFinished) {
      log.warn({ requestId, method: req.method, path: req.originalUrl }, "Requisição HTTP interrompida antes da resposta.");
    }
  });

  return next();
}
