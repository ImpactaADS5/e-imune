import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import log, { describeError } from "../lib/log";

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  jti: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    log.warn({ requestId: req.requestId, method: req.method, path: req.originalUrl }, "Auth.middleware: requisição sem token Bearer.");
    return res.status(401).json({ error: "Autenticação necessária." });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === "string" || !payload.sub || !payload.email || !payload.role || !payload.jti) {
      log.warn({ requestId: req.requestId }, "Auth.middleware: token sem os campos obrigatórios.");
      return res.status(401).json({ error: "Token inválido." });
    }

    const session = await prisma.session.findUnique({ where: { jti: payload.jti } });
    if (!session || session.userId !== payload.sub || session.revogadoEm || session.expiraEm <= new Date()) {
      log.warn({ requestId: req.requestId, userId: payload.sub, sessionId: payload.jti }, "Auth.middleware: sessão inexistente, expirada ou revogada.");
      return res.status(401).json({ error: "Sessão expirada ou revogada." });
    }

    req.user = { userId: payload.sub, email: payload.email, role: payload.role, jti: payload.jti };
    log.debug({ requestId: req.requestId, userId: payload.sub, role: payload.role, sessionId: payload.jti }, "Auth.middleware: token validado e usuário anexado à requisição.");
    return next();
  } catch (error) {
    log.warn({ requestId: req.requestId, error: describeError(error) }, "Auth.middleware: falha ao validar token.");
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      log.warn({ requestId: req.requestId, requiredRoles: roles }, "Auth.role: tentativa de autorização sem usuário autenticado.");
      return res.status(401).json({ error: "Autenticação necessária." });
    }
    if (!roles.includes(req.user.role)) {
      log.warn({ requestId: req.requestId, userId: req.user.userId, role: req.user.role, requiredRoles: roles }, "Auth.role: usuário sem permissão para a operação.");
      return res.status(403).json({ error: "Permissão insuficiente." });
    }
    log.debug({ requestId: req.requestId, userId: req.user.userId, role: req.user.role }, "Auth.role: permissão confirmada.");
    return next();
  };
}
