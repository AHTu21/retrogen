import type { Server, Socket } from "socket.io";
import * as Y from "yjs";
import { prisma } from "./lib/prisma.js";
import { roomAccessStatus } from "./roomAccess.js";

const MAX_UPDATE_B64_LEN = 280_000;
const MAX_UPDATES_PER_SEC = 60;

type CollabSession = {
  doc: Y.Doc;
  clients: number;
};

const sessions = new Map<string, CollabSession>();
const updateBuckets = new Map<string, { count: number; resetAt: number }>();

function collabKey(slug: string, cardId: string) {
  return `${slug}:${cardId}`;
}

function roomChannel(key: string) {
  return `collab:${key}`;
}

function uint8ToB64(u8: Uint8Array): string {
  return Buffer.from(u8).toString("base64");
}

function b64ToUint8(b64: string): Uint8Array | null {
  if (typeof b64 !== "string" || !b64) return null;
  try {
    const buf = Buffer.from(b64, "base64");
    if (buf.length > MAX_UPDATE_B64_LEN) return null;
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

function rateLimit(socketId: string): boolean {
  const now = Date.now();
  let b = updateBuckets.get(socketId);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + 1000 };
    updateBuckets.set(socketId, b);
  }
  b.count += 1;
  return b.count <= MAX_UPDATES_PER_SEC;
}

function getSocketCollabKeys(socket: Socket): Set<string> {
  const data = socket.data as { stickerCollabKeys?: Set<string> };
  if (!data.stickerCollabKeys) data.stickerCollabKeys = new Set();
  return data.stickerCollabKeys;
}

function leaveCollab(socket: Socket, key: string) {
  const keys = getSocketCollabKeys(socket);
  if (!keys.has(key)) return;
  keys.delete(key);
  socket.leave(roomChannel(key));
  const session = sessions.get(key);
  if (!session) return;
  session.clients = Math.max(0, session.clients - 1);
  if (session.clients === 0) {
    session.doc.destroy();
    sessions.delete(key);
  }
}

function reqLikeFromHandshake(socket: Socket) {
  const h: Record<string, string | string[] | undefined> = { ...socket.handshake.headers };
  const auth = socket.handshake.auth as { roomUnlockToken?: string; token?: string } | undefined;
  if (auth?.roomUnlockToken) h["x-room-unlock-token"] = auth.roomUnlockToken;
  if (auth?.token) h.authorization = `Bearer ${auth.token}`;
  return { headers: h };
}

async function assertCollabAccess(
  socket: Socket,
  slug: string,
): Promise<"ok" | "not_found" | "password_required" | "room_ended"> {
  if (typeof slug !== "string" || !slug) return "not_found";
  const st = await roomAccessStatus(reqLikeFromHandshake(socket), slug);
  if (st !== "ok") return st;
  const room = await prisma.room.findUnique({
    where: { slug },
    select: { status: true },
  });
  if (!room) return "not_found";
  if (room.status === "ended") return "room_ended";
  return "ok";
}

export function registerStickerCollabHandlers(io: Server) {
  io.on("connection", (socket) => {
    socket.on("disconnect", () => {
      const keys = [...getSocketCollabKeys(socket)];
      for (const key of keys) leaveCollab(socket, key);
      updateBuckets.delete(socket.id);
    });

    socket.on(
      "stickerCollab:join",
      async (
        payload: { slug?: string; cardId?: string },
        ack?: (err: { message: string } | null) => void,
      ) => {
        const slug = payload?.slug;
        const cardId = payload?.cardId;
        if (typeof slug !== "string" || !slug || typeof cardId !== "string" || !cardId) {
          ack?.({ message: "invalid payload" });
          return;
        }
        const access = await roomAccessStatus(reqLikeFromHandshake(socket), slug);
        if (access === "not_found") {
          ack?.({ message: "not_found" });
          return;
        }
        if (access === "password_required") {
          ack?.({ message: "room_password_required" });
          return;
        }
        const room = await prisma.room.findUnique({
          where: { slug },
          select: { status: true, id: true },
        });
        if (!room) {
          ack?.({ message: "not_found" });
          return;
        }
        if (room.status === "ended") {
          ack?.({ message: "room_ended" });
          return;
        }
        const card = await prisma.card.findFirst({
          where: { id: cardId, roomId: room.id },
          select: { id: true },
        });
        if (!card) {
          ack?.({ message: "card_not_found" });
          return;
        }

        const key = collabKey(slug, cardId);
        let session = sessions.get(key);
        if (!session) {
          session = { doc: new Y.Doc(), clients: 0 };
          sessions.set(key, session);
        }
        session.clients += 1;
        getSocketCollabKeys(socket).add(key);
        await socket.join(roomChannel(key));

        const state = uint8ToB64(Y.encodeStateAsUpdate(session.doc));
        socket.emit("stickerCollab:state", { cardId, update: state });
        ack?.(null);
      },
    );

    socket.on(
      "stickerCollab:update",
      async (payload: { slug?: string; cardId?: string; update?: string }) => {
        if (!rateLimit(socket.id)) return;
        const slug = payload?.slug;
        const cardId = payload?.cardId;
        if (typeof slug !== "string" || typeof cardId !== "string") return;
        const key = collabKey(slug, cardId);
        if (!getSocketCollabKeys(socket).has(key)) return;
        const bin = b64ToUint8(payload?.update ?? "");
        if (!bin) return;
        const access = await assertCollabAccess(socket, slug);
        if (access !== "ok") return;
        const session = sessions.get(key);
        if (!session) return;
        Y.applyUpdate(session.doc, bin, socket.id);
        socket.to(roomChannel(key)).emit("stickerCollab:sync", { cardId, update: payload!.update });
      },
    );

    socket.on(
      "stickerCollab:awareness",
      async (payload: { slug?: string; cardId?: string; update?: string }) => {
        if (!rateLimit(socket.id)) return;
        const slug = payload?.slug;
        const cardId = payload?.cardId;
        if (typeof slug !== "string" || typeof cardId !== "string") return;
        const key = collabKey(slug, cardId);
        if (!getSocketCollabKeys(socket).has(key)) return;
        if (!payload?.update || payload.update.length > MAX_UPDATE_B64_LEN) return;
        const access = await assertCollabAccess(socket, slug);
        if (access !== "ok") return;
        socket.to(roomChannel(key)).emit("stickerCollab:awareness", {
          cardId,
          update: payload.update,
          socketId: socket.id,
        });
      },
    );

    socket.on("stickerCollab:leave", (payload: { slug?: string; cardId?: string }) => {
      const slug = payload?.slug;
      const cardId = payload?.cardId;
      if (typeof slug !== "string" || typeof cardId !== "string") return;
      leaveCollab(socket, collabKey(slug, cardId));
    });
  });
}
