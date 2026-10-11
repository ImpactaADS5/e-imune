import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * ATENÇÃO (integração): se o time de back já tem middleware de autenticação,
 * use o deles — basta preencher `req.userId` e passar o middleware para
 * createVaccineRecordRouter(repo, seuMiddleware).
 * Este aqui espera "Authorization: Bearer <jwt>" com o id do usuário em `sub`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Não autenticado." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? "dev-secret") as jwt.JwtPayload;
    if (!payload.sub) throw new Error("sem sub");
    req.userId = String(payload.sub);
    next();
  } catch {
    return res.status(401).json({ message: "Sessão inválida ou expirada." });
  }
}
