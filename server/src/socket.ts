import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { roomAccessStatus } from "./roomAccess.js";
import { registerStickerCollabHandlers } from "./stickerCollabSocket.js";

function reqLikeFromHandshake(socket: {
  handshake: { headers: Record<string, string | string[] | undefined>; auth?: Record<string, unknown> };
}) {
  const h: Record<string, string | string[] | undefined> = { ...socket.handshake.headers };
  const auth = socket.handshake.auth as { roomUnlockToken?: string } | undefined;
  if (auth?.roomUnlockToken) {
    h["x-room-unlock-token"] = auth.roomUnlockToken;
  }
  return { headers: h };
}

export function attachSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: true, methods: ["GET", "POST"] },
    path: "/socket.io",
  });

  registerStickerCollabHandlers(io);

  io.on("connection", (socket) => {
    socket.on("join", async (slug: string, ack?: (err: Error | null) => void) => {
      if (typeof slug !== "string" || !slug) {
        ack?.(new Error("invalid slug"));
        return;
      }
      const st = await roomAccessStatus(reqLikeFromHandshake(socket), slug);
      if (st === "not_found") {
        ack?.(new Error("not_found"));
        return;
      }
      if (st === "password_required") {
        ack?.(new Error("room_password_required"));
        return;
      }
      socket.join(`room:${slug}`);
      ack?.(null);
    });
    socket.on("joinLobby", (ack?: (err: Error | null) => void) => {
      socket.join("lobby");
      ack?.(null);
    });

    /** Эфирные превью плоскости (перетаскивание и т.п.) без записи в БД — как у досок вроде Miro. */
    socket.on("planeLive", async (slug: string, patch: unknown, ack?: (err: Error | null) => void) => {
      if (typeof slug !== "string" || !slug) {
        ack?.(new Error("invalid slug"));
        return;
      }
      const st = await roomAccessStatus(reqLikeFromHandshake(socket), slug);
      if (st === "not_found") {
        ack?.(new Error("not_found"));
        return;
      }
      if (st === "password_required") {
        ack?.(new Error("room_password_required"));
        return;
      }
      if (patch == null || typeof patch !== "object" || Array.isArray(patch)) {
        ack?.(new Error("invalid patch"));
        return;
      }
      let raw: string;
      try {
        raw = JSON.stringify(patch);
      } catch {
        ack?.(new Error("invalid patch"));
        return;
      }
      if (raw.length > 512_000) {
        ack?.(new Error("patch too large"));
        return;
      }
      socket.to(`room:${slug}`).emit("room:patch", { type: "plane.preview", patch });
      ack?.(null);
    });
  });

  return io;
}
