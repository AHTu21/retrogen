import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import { prisma } from "../lib/prisma.js";
import { getJwtSecret } from "./config.js";
import { signAccessToken, verifyAccessToken } from "./jwt.js";
import {
  mergeCloudProfilePatch,
  parseCloudProfileV1,
  type CloudProfilePatch,
} from "./profileJson.js";
import {
  deleteProfileMediaFile,
  findProfileMediaFile,
  MAX_PROFILE_MEDIA_BYTES,
  mimeFromPath,
  normalizeProfileMediaMime,
  profileMediaApiPath,
  saveProfileMediaFile,
  type ProfileMediaKind,
} from "./profileMediaStorage.js";
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

function toAuthUserDto(user: { id: string; email: string; displayName: string; globalRole: string }) {
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
      user: toAuthUserDto(user),
    };
  });

  app.get("/api/auth/me/profile", async (req, reply) => {
    const u = await getBearerUser(req);
    if (!u) return reply.code(401).send({ error: "unauthorized" });
    const row = await prisma.user.findUnique({
      where: { id: u.id },
      select: { profileJson: true },
    });
    const profile = parseCloudProfileV1(row?.profileJson ?? null);
    return { profile };
  });

  app.patch<{ Body: CloudProfilePatch }>("/api/auth/me/profile", async (req, reply) => {
    const u = await getBearerUser(req);
    if (!u) return reply.code(401).send({ error: "unauthorized" });
    const body = req.body ?? {};
    if (!body || typeof body !== "object") {
      return reply.code(400).send({ error: "invalid_body" });
    }

    const row = await prisma.user.findUnique({
      where: { id: u.id },
      select: { profileJson: true, displayName: true },
    });
    const current = parseCloudProfileV1(row?.profileJson ?? null);
    const merged = mergeCloudProfilePatch(current, body);

    const displayName = merged.identity.displayName;
    const user = await prisma.user.update({
      where: { id: u.id },
        data: {
        profileJson: merged,
        ...(displayName !== row?.displayName ? { displayName } : {}),
      },
      select: { id: true, email: true, displayName: true, globalRole: true, profileJson: true },
    });

    const profile = parseCloudProfileV1(user.profileJson ?? null);
    return {
      profile,
      user: toAuthUserDto(user),
    };
  });

  app.post("/api/auth/me/profile/media", async (req, reply) => {
    const u = await getBearerUser(req);
    if (!u) return reply.code(401).send({ error: "unauthorized" });

    let kind: ProfileMediaKind | null = null;
    let fileBuffer: Buffer | null = null;
    let mime: string | null = null;
    let filename = "image.jpg";

    const parts = req.parts();
    for await (const part of parts) {
      if (part.type === "field" && part.fieldname === "kind") {
        const v = String(part.value ?? "").trim();
        if (v === "avatar" || v === "wallpaper") kind = v;
      } else if (part.type === "file" && part.fieldname === "file") {
        fileBuffer = await part.toBuffer();
        filename = part.filename ?? filename;
        mime = normalizeProfileMediaMime(part.mimetype, filename);
      }
    }

    if (!kind || !fileBuffer || !mime) {
      return reply.code(400).send({ error: "bad_media_upload" });
    }
    if (fileBuffer.length > MAX_PROFILE_MEDIA_BYTES) {
      return reply.code(413).send({ error: "media_too_large" });
    }

    await deleteProfileMediaFile(u.id, kind);
    const mediaPath = await saveProfileMediaFile(u.id, kind, fileBuffer, mime);

    const row = await prisma.user.findUnique({
      where: { id: u.id },
      select: { profileJson: true, displayName: true },
    });
    const current = parseCloudProfileV1(row?.profileJson ?? null);
    const mediaKey = kind === "avatar" ? "avatarPath" : "wallpaperPath";
    const merged = mergeCloudProfilePatch(current, {
      media: { [mediaKey]: mediaPath },
    });

    const user = await prisma.user.update({
      where: { id: u.id },
      data: { profileJson: merged },
      select: { id: true, email: true, displayName: true, globalRole: true, profileJson: true },
    });

    return reply.code(201).send({
      kind,
      path: mediaPath,
      profile: parseCloudProfileV1(user.profileJson ?? null),
      user: toAuthUserDto(user),
    });
  });

  app.delete<{ Params: { kind: string } }>("/api/auth/me/profile/media/:kind", async (req, reply) => {
    const u = await getBearerUser(req);
    if (!u) return reply.code(401).send({ error: "unauthorized" });
    const kind = req.params.kind === "avatar" || req.params.kind === "wallpaper" ? req.params.kind : null;
    if (!kind) return reply.code(400).send({ error: "bad_kind" });

    await deleteProfileMediaFile(u.id, kind);
    const row = await prisma.user.findUnique({ where: { id: u.id }, select: { profileJson: true } });
    const current = parseCloudProfileV1(row?.profileJson ?? null);
    const mediaKey = kind === "avatar" ? "avatarPath" : "wallpaperPath";
    const merged = mergeCloudProfilePatch(current, { media: { [mediaKey]: null } });
    await prisma.user.update({ where: { id: u.id }, data: { profileJson: merged } });

    return { ok: true, path: profileMediaApiPath(kind) };
  });

  app.get<{ Params: { kind: string } }>("/api/auth/me/profile/media/:kind", async (req, reply) => {
    const u = await getBearerUser(req);
    if (!u) return reply.code(401).send({ error: "unauthorized" });
    const kind = req.params.kind === "avatar" || req.params.kind === "wallpaper" ? req.params.kind : null;
    if (!kind) return reply.code(400).send({ error: "bad_kind" });

    const filePath = await findProfileMediaFile(u.id, kind);
    if (!filePath) return reply.code(404).send({ error: "not_found" });

    const buf = await fs.readFile(filePath);
    return reply.type(mimeFromPath(filePath)).header("Cache-Control", "private, max-age=3600").send(buf);
  });
}
