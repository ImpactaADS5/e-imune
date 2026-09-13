import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";

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
  if (!token) return res.status(401).json({ error: "Autenticação necessária." });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === "string" || !payload.sub || !payload.email || !payload.role || !payload.jti) {
      return res.status(401).json({ error: "Token inválido." });
    }

    const session = await prisma.session.findUnique({ where: { jti: payload.jti } });
    if (!session || session.userId !== payload.sub || session.revogadoEm || session.expiraEm <= new Date()) {
      return res.status(401).json({ error: "Sessão expirada ou revogada." });
    }

    req.user = { userId: payload.sub, email: payload.email, role: payload.role, jti: payload.jti };
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Autenticação necessária." });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Permissão insuficiente." });
    return next();
  };
}
