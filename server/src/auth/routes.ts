import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { getJwtSecret } from "./config.js";
import { signAccessToken, verifyAccessToken } from "./jwt.js";
import { hashPassword, verifyPassword } from "./password.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export type AuthUser = { id: string; email: string; displayName: string; globalRole: string };

export async function getBearerUser(req: { headers: { authorization?: string } }): Promise<AuthUser | null> {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return null;
  const token = h.slice(7).trim();
  if (!token) return null;
  const secret = getJwtSecret();
  const payload = await verifyAccessToken(token, secret);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, displayName: true, globalRole: true },
  });
  if (!user) return null;
  return { id: user.id, email: user.email, displayName: user.displayName, globalRole: user.globalRole };
}

export function registerAuthRoutes(app: FastifyInstance) {
  app.post<{ Body: { email?: string; password?: string; displayName?: string } }>("/api/auth/register", async (req, reply) => {
    const email = normalizeEmail(req.body?.email ?? "");
    const password = (req.body?.password ?? "").trim();
    const displayName = (req.body?.displayName ?? "").trim().slice(0, 120);
    if (!EMAIL_RE.test(email)) {
      return reply.code(400).send({ error: "invalid_email" });
    }
    if (password.length < 8 || password.length > 128) {
      return reply.code(400).send({ error: "invalid_password" });
    }
    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) {
      return reply.code(409).send({ error: "email_taken" });
    }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, displayName },
      select: { id: true, email: true, displayName: true, globalRole: true },
    });
    const token = await signAccessToken({ userId: user.id, email: user.email }, getJwtSecret());
    return reply.code(201).send({
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName, globalRole: user.globalRole },
    });
  });

  app.post<{ Body: { email?: string; password?: string } }>("/api/auth/login", async (req, reply) => {
    const email = normalizeEmail(req.body?.email ?? "");
    const password = (req.body?.password ?? "").trim();
    if (!email || !password) {
      return reply.code(400).send({ error: "credentials_required" });
    }
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true, globalRole: true, passwordHash: true },
    });
    if (!user) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }
    const token = await signAccessToken({ userId: user.id, email: user.email }, getJwtSecret());
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        globalRole: user.globalRole,
      },
    };
  });

  app.get("/api/auth/me", async (req, reply) => {
    const u = await getBearerUser(req);
    if (!u) return reply.code(401).send({ error: "unauthorized" });
    return { user: u };
  });

  app.patch<{ Body: { displayName?: string } }>("/api/auth/me", async (req, reply) => {
    const u = await getBearerUser(req);
    if (!u) return reply.code(401).send({ error: "unauthorized" });
    const displayName =
      typeof req.body?.displayName === "string" ? req.body.displayName.trim().slice(0, 120) : null;
    if (displayName === null) {
      return reply.code(400).send({ error: "display_name_required" });
    }
    const user = await prisma.user.update({
      where: { id: u.id },
      data: { displayName },
      select: { id: true, email: true, displayName: true, globalRole: true },
    });
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        globalRole: user.globalRole,
      },
    };
  });
}
