import type { Server, Socket } from "socket.io";
import { getBearerUser } from "../auth/routes.js";
import { assertChatMember } from "./chatAccess.js";
import type { MessageDto } from "./chatDto.js";

function reqLikeFromHandshake(socket: Socket) {
  const h: Record<string, string | string[] | undefined> = { ...socket.handshake.headers };
  const auth = socket.handshake.auth as { token?: string; roomUnlockToken?: string } | undefined;
  if (auth?.token) h.authorization = `Bearer ${auth.token}`;
  if (auth?.roomUnlockToken) h["x-room-unlock-token"] = auth.roomUnlockToken;
  return { headers: h };
}

export function emitToChat(io: Server, chatId: string, event: string, payload: unknown) {
  io.to(`chat:${chatId}`).emit(event, payload);
}

export function emitToUser(io: Server, userId: string, event: string, payload: unknown) {
  io.to(`user:${userId}`).emit(event, payload);
}

export function emitMessageCreated(io: Server, chatId: string, message: MessageDto, memberUserIds: string[]) {
  emitToChat(io, chatId, "chat:message.created", { chatId, message });
  for (const uid of memberUserIds) {
    emitToUser(io, uid, "chat:list.updated", { chatId });
  }
}

export function emitMessageUpdated(io: Server, chatId: string, message: MessageDto, memberUserIds: string[]) {
  emitToChat(io, chatId, "chat:message.updated", { chatId, message });
  for (const uid of memberUserIds) {
    emitToUser(io, uid, "chat:list.updated", { chatId });
  }
}

export function emitMessageHidden(io: Server, chatId: string, messageId: string, userId: string) {
  emitToUser(io, userId, "chat:message.hidden", { chatId, messageId });
  emitToUser(io, userId, "chat:list.updated", { chatId });
}

export function emitChatListUpdated(io: Server, userIds: string[], chatId: string) {
  for (const uid of userIds) {
    emitToUser(io, uid, "chat:list.updated", { chatId });
  }
}

export function registerChatSocketHandlers(io: Server) {
  io.on("connection", async (socket) => {
    const user = await getBearerUser(reqLikeFromHandshake(socket));
    if (user) {
      socket.join(`user:${user.id}`);
      (socket.data as { userId?: string }).userId = user.id;
    }

    socket.on("chat:join", async (chatId: string, ack?: (err: Error | null) => void) => {
      try {
        if (!user) throw new Error("auth_required");
        if (typeof chatId !== "string" || !chatId) throw new Error("invalid chat");
        await assertChatMember(chatId, user.id);
        socket.join(`chat:${chatId}`);
        ack?.(null);
      } catch (e) {
        ack?.(e instanceof Error ? e : new Error("join_failed"));
      }
    });

    socket.on("chat:leave", (chatId: string) => {
      if (typeof chatId === "string" && chatId) socket.leave(`chat:${chatId}`);
    });

    socket.on("chat:typing", async (chatId: string, isTyping: boolean) => {
      if (!user || typeof chatId !== "string" || !chatId) return;
      try {
        await assertChatMember(chatId, user.id);
        socket.to(`chat:${chatId}`).emit("chat:typing", {
          chatId,
          userId: user.id,
          displayName: user.displayName,
          isTyping: !!isTyping,
        });
      } catch {
        /* ignore */
      }
    });
  });
}
