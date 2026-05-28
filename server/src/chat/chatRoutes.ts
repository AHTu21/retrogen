import type { FastifyInstance, FastifyReply } from "fastify";
import type { Server } from "socket.io";
import { getBearerUser } from "../auth/routes.js";
import { requireAuthUser } from "./chatAccess.js";
import { chatToListItem } from "./chatDto.js";
import { guessMimeType } from "./attachmentPolicy.js";
import { readChatAttachmentFile } from "./attachmentStorage.js";
import {
  createChannelChat,
  createGroupChat,
  getAttachmentForDownload,
  getChatDetail,
  getChatMemberUserIds,
  getOrCreateDirectChat,
  listChatsForUser,
  listMessages,
  markChatRead,
  searchUsersForChat,
  sendMessage,
  deleteChatMessage,
  editChatMessage,
  forwardMessageToSaved,
  listSupportQuickCommands,
  runSupportQuickCommand,
  updateGroupAvatar,
  addGroupMembers,
  leaveGroupChat,
  deleteGroupChat,
} from "./chatService.js";
import {
  emitChatListUpdated,
  emitMessageCreated,
  emitMessageHidden,
  emitMessageUpdated,
} from "./chatSocket.js";

function mapChatError(e: unknown, reply: FastifyReply) {
  const msg = e instanceof Error ? e.message : "internal";
  const codes: Record<string, number> = {
    auth_required: 401,
    chat_forbidden: 403,
    not_found: 404,
    user_not_found: 404,
    reply_not_found: 400,
    bad_text: 400,
    text_too_long: 400,
    bad_title: 400,
    self_chat_forbidden: 400,
    system_chat_readonly: 403,
    not_support_chat: 400,
    unknown_command: 400,
    attachment_type_not_allowed: 400,
    attachment_too_large: 413,
    too_many_attachments: 400,
    attachments_required: 400,
    delete_forbidden: 403,
    already_deleted: 400,
    edit_forbidden: 403,
    cannot_forward_saved: 400,
    not_a_group: 400,
    bad_avatar: 400,
    avatar_too_large: 413,
    no_members_to_add: 400,
    members_already_in_chat: 400,
  };
  const code = codes[msg] ?? 500;
  if (code === 500) return reply.code(500).send({ error: "internal" });
  return reply.code(code).send({ error: msg });
}

export function registerChatRoutes(app: FastifyInstance, io: Server) {
  app.get("/api/chats", async (req, reply) => {
    try {
      const user = await requireAuthUser(await getBearerUser(req));
      const chats = await listChatsForUser(user.id);
      return { chats };
    } catch (e) {
      return mapChatError(e, reply);
    }
  });

  app.get("/api/chats/support/quick-commands", async (req, reply) => {
    try {
      await requireAuthUser(await getBearerUser(req));
      return { commands: listSupportQuickCommands() };
    } catch (e) {
      return mapChatError(e, reply);
    }
  });

  app.get("/api/chats/users/search", async (req, reply) => {
    try {
      await requireAuthUser(await getBearerUser(req));
      const q = (req.query as { q?: string }).q ?? "";
      const users = await searchUsersForChat(q);
      return { users };
    } catch (e) {
      return mapChatError(e, reply);
    }
  });

  app.post<{ Body: { userId?: string } }>("/api/chats/direct", async (req, reply) => {
    try {
      const user = await requireAuthUser(await getBearerUser(req));
      const otherId = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";
      if (!otherId) return reply.code(400).send({ error: "user_id_required" });
      const chat = await getOrCreateDirectChat(user.id, otherId);
      const unread = 0;
      return reply.code(201).send({ chat: chatToListItem(chat, user.id, unread) });
    } catch (e) {
      return mapChatError(e, reply);
    }
  });

  app.post<{ Body: { title?: string; memberIds?: string[] } }>("/api/chats/group", async (req, reply) => {
    try {
      const user = await requireAuthUser(await getBearerUser(req));
      const memberIds = Array.isArray(req.body?.memberIds)
        ? req.body.memberIds.filter((x): x is string => typeof x === "string")
        : [];
      const chat = await createGroupChat(user.id, req.body?.title ?? "", memberIds);
      return reply.code(201).send({ chat: chatToListItem(chat, user.id, 0) });
    } catch (e) {
      return mapChatError(e, reply);
    }
  });

  app.post<{ Body: { title?: string; description?: string } }>("/api/chats/channel", async (req, reply) => {
    try {
      const user = await requireAuthUser(await getBearerUser(req));
      const chat = await createChannelChat(
        user.id,
        req.body?.title ?? "",
        req.body?.description ?? "",
      );
      return reply.code(201).send({ chat: chatToListItem(chat, user.id, 0) });
    } catch (e) {
      return mapChatError(e, reply);
    }
  });

  app.get<{ Params: { chatId: string } }>("/api/chats/:chatId", async (req, reply) => {
    try {
      const user = await requireAuthUser(await getBearerUser(req));
      return await getChatDetail(req.params.chatId, user.id);
    } catch (e) {
      return mapChatError(e, reply);
    }
  });

  app.patch<{ Params: { chatId: string }; Body: { avatarUrl?: string | null } }>(
    "/api/chats/:chatId/group/avatar",
    async (req, reply) => {
      try {
        const user = await requireAuthUser(await getBearerUser(req));
        const raw = req.body?.avatarUrl;
        const avatarUrl = raw === null || raw === undefined ? null : typeof raw === "string" ? raw : null;
        const chat = await updateGroupAvatar(req.params.chatId, user.id, avatarUrl);
        const memberIds = await getChatMemberUserIds(req.params.chatId);
        emitChatListUpdated(io, memberIds, req.params.chatId);
        return { chat };
      } catch (e) {
        return mapChatError(e, reply);
      }
    },
  );

  app.post<{ Params: { chatId: string }; Body: { memberIds?: string[] } }>(
    "/api/chats/:chatId/group/members",
    async (req, reply) => {
      try {
        const user = await requireAuthUser(await getBearerUser(req));
        const memberIds = Array.isArray(req.body?.memberIds)
          ? req.body.memberIds.filter((x): x is string => typeof x === "string")
          : [];
        const chat = await addGroupMembers(req.params.chatId, user.id, memberIds);
        const allIds = await getChatMemberUserIds(req.params.chatId);
        emitChatListUpdated(io, allIds, req.params.chatId);
        return reply.code(201).send({ chat });
      } catch (e) {
        return mapChatError(e, reply);
      }
    },
  );

  app.post<{ Params: { chatId: string } }>("/api/chats/:chatId/leave", async (req, reply) => {
    try {
      const user = await requireAuthUser(await getBearerUser(req));
      const result = await leaveGroupChat(req.params.chatId, user.id);
      emitChatListUpdated(io, result.notifyUserIds, req.params.chatId);
      return result;
    } catch (e) {
      return mapChatError(e, reply);
    }
  });

  app.delete<{ Params: { chatId: string } }>("/api/chats/:chatId", async (req, reply) => {
    try {
      const user = await requireAuthUser(await getBearerUser(req));
      const result = await deleteGroupChat(req.params.chatId, user.id);
      emitChatListUpdated(io, result.notifyUserIds, req.params.chatId);
      return result;
    } catch (e) {
      return mapChatError(e, reply);
    }
  });

  app.get<{ Params: { chatId: string } }>("/api/chats/:chatId/messages", async (req, reply) => {
    try {
      const user = await requireAuthUser(await getBearerUser(req));
      const q = req.query as { cursor?: string; limit?: string };
      const limit = q.limit ? Number(q.limit) : undefined;
      return await listMessages(req.params.chatId, user.id, {
        cursor: typeof q.cursor === "string" ? q.cursor : undefined,
        limit,
      });
    } catch (e) {
      return mapChatError(e, reply);
    }
  });

  app.get<{ Params: { attachmentId: string }; Querystring: { download?: string } }>(
    "/api/chat/attachments/:attachmentId",
    async (req, reply) => {
      try {
        const user = await requireAuthUser(await getBearerUser(req));
        const row = await getAttachmentForDownload(req.params.attachmentId, user.id);
        const buf = await readChatAttachmentFile(row.storageKey);
        const asDownload = req.query.download === "1" || req.query.download === "true";
        const disposition = asDownload ? "attachment" : "inline";
        return reply
          .header("Content-Type", row.mimeType)
          .header(
            "Content-Disposition",
            `${disposition}; filename*=UTF-8''${encodeURIComponent(row.originalName)}`,
          )
          .send(buf);
      } catch (e) {
        return mapChatError(e, reply);
      }
    },
  );

  app.post<{ Params: { chatId: string } }>(
    "/api/chats/:chatId/messages/upload",
    async (req, reply) => {
      try {
        const user = await requireAuthUser(await getBearerUser(req));
        const parts = req.parts();
        let text = "";
        let clientMessageId: string | null = null;
        let replyToMessageId: string | null = null;
        const files: Array<{ originalName: string; mimeType: string; buffer: Buffer }> = [];

        for await (const part of parts) {
          if (part.type === "file") {
            const buffer = await part.toBuffer();
            const name = part.filename ?? "file";
            files.push({
              originalName: name,
              mimeType: guessMimeType(name, part.mimetype),
              buffer,
            });
          } else if (part.type === "field" && part.fieldname === "text") {
            text = String(part.value ?? "");
          } else if (part.type === "field" && part.fieldname === "clientMessageId") {
            const v = String(part.value ?? "").trim();
            clientMessageId = v || null;
          } else if (part.type === "field" && part.fieldname === "replyToMessageId") {
            const v = String(part.value ?? "").trim();
            replyToMessageId = v || null;
          }
        }

        if (files.length === 0) {
          return reply.code(400).send({ error: "attachments_required" });
        }

        const message = await sendMessage(req.params.chatId, user.id, {
          text,
          clientMessageId,
          replyToMessageId,
          attachments: files,
        });
        const memberIds = await getChatMemberUserIds(req.params.chatId);
        emitMessageCreated(io, req.params.chatId, message, memberIds);
        return reply.code(201).send({ message });
      } catch (e) {
        return mapChatError(e, reply);
      }
    },
  );

  app.post<{
    Params: { chatId: string };
    Body: { text?: string; replyToMessageId?: string | null; clientMessageId?: string | null };
  }>("/api/chats/:chatId/messages", async (req, reply) => {
    try {
      const user = await requireAuthUser(await getBearerUser(req));
      const message = await sendMessage(req.params.chatId, user.id, {
        text: req.body?.text,
        replyToMessageId: req.body?.replyToMessageId ?? null,
        clientMessageId: req.body?.clientMessageId ?? null,
      });
      const memberIds = await getChatMemberUserIds(req.params.chatId);
      emitMessageCreated(io, req.params.chatId, message, memberIds);
      return reply.code(201).send({ message });
    } catch (e) {
      return mapChatError(e, reply);
    }
  });

  app.patch<{
    Params: { chatId: string; messageId: string };
    Body: { text?: string };
  }>("/api/chats/:chatId/messages/:messageId", async (req, reply) => {
    try {
      const user = await requireAuthUser(await getBearerUser(req));
      const text = typeof req.body?.text === "string" ? req.body.text : "";
      const message = await editChatMessage(req.params.chatId, req.params.messageId, user.id, text);
      const memberIds = await getChatMemberUserIds(req.params.chatId);
      emitMessageUpdated(io, req.params.chatId, message, memberIds);
      return { message };
    } catch (e) {
      return mapChatError(e, reply);
    }
  });

  app.post<{ Params: { chatId: string; messageId: string } }>(
    "/api/chats/:chatId/messages/:messageId/forward-to-saved",
    async (req, reply) => {
      try {
        const user = await requireAuthUser(await getBearerUser(req));
        const message = await forwardMessageToSaved(
          req.params.chatId,
          req.params.messageId,
          user.id,
        );
        const savedChatId = message.chatId;
        const memberIds = await getChatMemberUserIds(savedChatId);
        emitMessageCreated(io, savedChatId, message, memberIds);
        return reply.code(201).send({ message, savedChatId });
      } catch (e) {
        return mapChatError(e, reply);
      }
    },
  );

  app.post<{
    Params: { chatId: string; messageId: string };
    Body: { scope?: string };
  }>("/api/chats/:chatId/messages/:messageId/delete", async (req, reply) => {
    try {
      const user = await requireAuthUser(await getBearerUser(req));
      const scope = req.body?.scope === "everyone" ? "everyone" : "me";
      const result = await deleteChatMessage(
        req.params.chatId,
        req.params.messageId,
        user.id,
        scope,
        user.globalRole,
      );
      const memberIds = await getChatMemberUserIds(req.params.chatId);
      if (result.scope === "everyone") {
        emitMessageUpdated(io, req.params.chatId, result.message, memberIds);
      } else {
        emitMessageHidden(io, req.params.chatId, result.messageId, user.id);
      }
      return result;
    } catch (e) {
      return mapChatError(e, reply);
    }
  });

  app.post<{ Params: { chatId: string }; Body: { commandId?: string } }>(
    "/api/chats/:chatId/quick-command",
    async (req, reply) => {
      try {
        const user = await requireAuthUser(await getBearerUser(req));
        const commandId = typeof req.body?.commandId === "string" ? req.body.commandId.trim() : "";
        if (!commandId) return reply.code(400).send({ error: "command_id_required" });
        const { userMessage, replyMessage } = await runSupportQuickCommand(
          req.params.chatId,
          user.id,
          commandId,
        );
        const memberIds = await getChatMemberUserIds(req.params.chatId);
        emitMessageCreated(io, req.params.chatId, userMessage, memberIds);
        emitMessageCreated(io, req.params.chatId, replyMessage, memberIds);
        return reply.code(201).send({ userMessage, replyMessage });
      } catch (e) {
        return mapChatError(e, reply);
      }
    },
  );

  app.post<{ Params: { chatId: string }; Body: { messageId?: string } }>(
    "/api/chats/:chatId/read",
    async (req, reply) => {
      try {
        const user = await requireAuthUser(await getBearerUser(req));
        const messageId = typeof req.body?.messageId === "string" ? req.body.messageId : "";
        if (!messageId) return reply.code(400).send({ error: "message_id_required" });
        const result = await markChatRead(req.params.chatId, user.id, messageId);
        io.to(`chat:${req.params.chatId}`).emit("chat:receipt.updated", {
          chatId: req.params.chatId,
          userId: user.id,
          messageId,
          kind: "read",
        });
        return result;
      } catch (e) {
        return mapChatError(e, reply);
      }
    },
  );
}
