import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { chatToListItem, messageToDto } from "./chatDto.js";
import { assertChatMember, getChatMembership } from "./chatAccess.js";
import { canWriteToChat } from "./chatPolicy.js";
import { getSupportQuickCommand, listSupportQuickCommandsPublic } from "./supportQuickCommands.js";
import {
  isAllowedAttachmentFilename,
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_ATTACHMENT_BYTES,
} from "./attachmentPolicy.js";
import { saveChatAttachmentFile } from "./attachmentStorage.js";

const MAX_MESSAGE_LEN = 10_000;
const PAGE_SIZE = 50;

function isPrismaMissingTableError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2021"
  );
}

const SYSTEM_CHATS: Array<{ systemKey: string; title: string; description: string }> = [
  { systemKey: "news", title: "Новости Retrogen", description: "Обновления и новости продукта" },
  { systemKey: "support", title: "Поддержка", description: "Вопросы по Retrogen" },
];

let bootstrapDone = false;

export async function ensureMessengerBootstrap() {
  if (bootstrapDone) return;
  bootstrapDone = true;
  for (const spec of SYSTEM_CHATS) {
    const existing = await prisma.chat.findUnique({ where: { systemKey: spec.systemKey } });
    if (existing) continue;
    await prisma.$transaction(async (tx) => {
      const chat = await tx.chat.create({
        data: {
          kind: "system",
          title: spec.title,
          description: spec.description,
          systemKey: spec.systemKey,
        },
      });
      const welcome = await tx.message.create({
        data: {
          chatId: chat.id,
          kind: "system",
          text: `Добро пожаловать в «${spec.title}». Здесь будут появляться сообщения от команды Retrogen.`,
        },
      });
      await tx.chat.update({
        where: { id: chat.id },
        data: { lastMessageId: welcome.id, updatedAt: new Date() },
      });
    });
  }
}

async function ensureSystemMembership(userId: string) {
  const systemChats = await prisma.chat.findMany({
    where: { kind: "system" },
    select: { id: true },
  });
  for (const c of systemChats) {
    await prisma.chatMember.upsert({
      where: { chatId_userId: { chatId: c.id, userId } },
      create: { chatId: c.id, userId, role: "member" },
      update: {},
    });
  }
}

function directKeyFor(userIdA: string, userIdB: string) {
  return [userIdA, userIdB].sort().join(":");
}

function savedDirectKey(userId: string) {
  return `saved:${userId}`;
}

export async function ensurePersonalSavedChat(userId: string) {
  const directKey = savedDirectKey(userId);
  const existing = await prisma.chat.findUnique({
    where: { directKey },
    include: chatListInclude,
  });
  if (existing) {
    await prisma.chatMember.upsert({
      where: { chatId_userId: { chatId: existing.id, userId } },
      create: { chatId: existing.id, userId, role: "owner" },
      update: {},
    });
    return existing;
  }
  return prisma.chat.create({
    data: {
      kind: "channel",
      directKey,
      title: "Избранное",
      description: "Заметки и пересланные сообщения только для вас",
      createdById: userId,
      members: { create: { userId, role: "owner" } },
    },
    include: chatListInclude,
  });
}

async function countUnread(chatId: string, member: { lastReadMessageId: string | null }) {
  if (!member.lastReadMessageId) {
    return prisma.message.count({
      where: { chatId, deletedAt: null },
    });
  }
  const anchor = await prisma.message.findUnique({
    where: { id: member.lastReadMessageId },
    select: { createdAt: true },
  });
  if (!anchor) {
    return prisma.message.count({ where: { chatId, deletedAt: null } });
  }
  return prisma.message.count({
    where: { chatId, deletedAt: null, createdAt: { gt: anchor.createdAt } },
  });
}

const chatListInclude = {
  members: { include: { user: { select: { id: true, displayName: true, email: true } } } },
  lastMessage: { include: { author: { select: { id: true, displayName: true, email: true } } } },
} as const;

export async function listChatsForUser(userId: string) {
  await ensureMessengerBootstrap();
  await ensureSystemMembership(userId);
  await ensurePersonalSavedChat(userId);

  const memberships = await prisma.chatMember.findMany({
    where: { userId },
    include: { chat: { include: chatListInclude } },
    orderBy: { chat: { updatedAt: "desc" } },
  });

  const items = [];
  for (const m of memberships) {
    const unread = await countUnread(m.chatId, m);
    items.push(chatToListItem(m.chat, userId, unread));
  }
  items.sort((a, b) => {
    if (a.isSaved !== b.isSaved) return a.isSaved ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  return items;
}

export async function forwardMessageToSaved(
  sourceChatId: string,
  messageId: string,
  userId: string,
) {
  await assertChatMember(sourceChatId, userId);
  const sourceChat = await prisma.chat.findUnique({
    where: { id: sourceChatId },
    select: { title: true, kind: true, systemKey: true, directKey: true },
  });
  if (!sourceChat) throw new Error("not_found");
  if (sourceChat.directKey?.startsWith("saved:")) throw new Error("cannot_forward_saved");

  const msg = await prisma.message.findFirst({
    where: { id: messageId, chatId: sourceChatId },
    include: {
      author: { select: { displayName: true, email: true } },
      attachments: true,
    },
  });
  if (!msg || msg.deletedAt) throw new Error("not_found");

  const saved = await ensurePersonalSavedChat(userId);
  const authorName = msg.author?.displayName || msg.author?.email || "Участник";
  const chatLabel =
    sourceChat.kind === "direct"
      ? authorName
      : sourceChat.title || "Чат";
  const lines = [`↪️ Из «${chatLabel}»`, `${authorName}:`];
  if (msg.text.trim()) lines.push(msg.text.trim());
  if (msg.attachments.length > 0) {
    const names = msg.attachments.map((a) => a.originalName).join(", ");
    lines.push(`📎 ${msg.attachments.length} файл(ов): ${names}`);
  }
  if (lines.length === 2) lines.push("(без текста)");

  return sendMessage(saved.id, userId, { text: lines.join("\n") });
}

export async function getOrCreateDirectChat(creatorId: string, otherUserId: string) {
  if (creatorId === otherUserId) throw new Error("self_chat_forbidden");
  const other = await prisma.user.findUnique({ where: { id: otherUserId }, select: { id: true } });
  if (!other) throw new Error("user_not_found");

  const directKey = directKeyFor(creatorId, otherUserId);
  const existing = await prisma.chat.findUnique({
    where: { directKey },
    include: chatListInclude,
  });
  if (existing) {
    await prisma.chatMember.upsert({
      where: { chatId_userId: { chatId: existing.id, userId: creatorId } },
      create: { chatId: existing.id, userId: creatorId, role: "member" },
      update: {},
    });
    await prisma.chatMember.upsert({
      where: { chatId_userId: { chatId: existing.id, userId: otherUserId } },
      create: { chatId: existing.id, userId: otherUserId, role: "member" },
      update: {},
    });
    return existing;
  }

  return prisma.chat.create({
    data: {
      kind: "direct",
      directKey,
      createdById: creatorId,
      members: {
        create: [
          { userId: creatorId, role: "owner" },
          { userId: otherUserId, role: "member" },
        ],
      },
    },
    include: chatListInclude,
  });
}

export async function createGroupChat(
  creatorId: string,
  title: string,
  memberIds: string[],
) {
  const t = title.trim().slice(0, 120);
  if (!t) throw new Error("bad_title");
  const unique = [...new Set([creatorId, ...memberIds])];
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });
  if (users.length !== unique.length) throw new Error("user_not_found");

  return prisma.chat.create({
    data: {
      kind: "group",
      title: t,
      createdById: creatorId,
      members: {
        create: unique.map((uid) => ({
          userId: uid,
          role: uid === creatorId ? "owner" : "member",
        })),
      },
    },
    include: chatListInclude,
  });
}

export async function getChatDetail(chatId: string, userId: string) {
  await assertChatMember(chatId, userId);
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: chatListInclude,
  });
  if (!chat) throw new Error("not_found");
  const member = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });
  const unread = member ? await countUnread(chatId, member) : 0;
  return { chat: chatToListItem(chat, userId, unread) };
}

export async function listMessages(
  chatId: string,
  userId: string,
  opts: { cursor?: string; limit?: number },
) {
  await assertChatMember(chatId, userId);
  const limit = Math.min(Math.max(opts.limit ?? PAGE_SIZE, 1), 100);
  const cursorMsg = opts.cursor
    ? await prisma.message.findFirst({
        where: { id: opts.cursor, chatId },
        select: { createdAt: true },
      })
    : null;

  const whereBase = {
    chatId,
    ...(cursorMsg ? { createdAt: { lt: cursorMsg.createdAt } } : {}),
  };
  let rows;
  try {
    rows = await prisma.message.findMany({
      where: { ...whereBase, hiddenFor: { none: { userId } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: messageInclude,
    });
  } catch (e) {
    if (!isPrismaMissingTableError(e)) throw e;
    rows = await prisma.message.findMany({
      where: whereBase,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: messageInclude,
    });
  }

  const messages = rows.reverse().map(messageToDto);
  const nextCursor = rows.length === limit ? rows[0]?.id ?? null : null;
  return { messages, nextCursor };
}

export async function sendMessage(
  chatId: string,
  userId: string,
  body: {
    text?: string;
    replyToMessageId?: string | null;
    clientMessageId?: string | null;
    attachments?: IncomingAttachment[];
  },
) {
  await assertChatMember(chatId, userId);
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { kind: true, systemKey: true },
  });
  if (!chat) throw new Error("not_found");
  if (!canWriteToChat(chat)) throw new Error("system_chat_readonly");

  const files = body.attachments ?? [];
  if (files.length > MAX_ATTACHMENTS_PER_MESSAGE) throw new Error("too_many_attachments");

  const text = (body.text ?? "").trim();
  if (!text && files.length === 0) throw new Error("bad_text");
  if (text.length > MAX_MESSAGE_LEN) throw new Error("text_too_long");

  for (const f of files) {
    if (!isAllowedAttachmentFilename(f.originalName)) throw new Error("attachment_type_not_allowed");
    if (f.buffer.length > MAX_ATTACHMENT_BYTES) throw new Error("attachment_too_large");
  }

  if (body.clientMessageId) {
    const dup = await prisma.message.findUnique({
      where: { chatId_clientMessageId: { chatId, clientMessageId: body.clientMessageId } },
      include: messageInclude,
    });
    if (dup) return messageToDto(dup);
  }

  if (body.replyToMessageId) {
    const reply = await prisma.message.findFirst({
      where: { id: body.replyToMessageId, chatId },
    });
    if (!reply) throw new Error("reply_not_found");
  }

  const savedFiles = await Promise.all(
    files.map(async (f) => {
      const stored = await saveChatAttachmentFile(chatId, f.originalName, f.buffer);
      return { ...stored, originalName: f.originalName, mimeType: f.mimeType, sizeBytes: f.buffer.length };
    }),
  );

  const msg = await prisma.$transaction(async (tx) => {
    const kind = files.length > 0 && !text ? "file" : "text";

    const created = await tx.message.create({
      data: {
        chatId,
        authorId: userId,
        kind,
        text,
        replyToMessageId: body.replyToMessageId ?? null,
        clientMessageId: body.clientMessageId ?? null,
        attachments: {
          create: savedFiles.map((f) => ({
            storageKey: f.storageKey,
            originalName: f.originalName,
            mimeType: f.mimeType,
            sizeBytes: f.sizeBytes,
            checksum: f.checksum,
          })),
        },
      },
      include: messageInclude,
    });
    await tx.chat.update({
      where: { id: chatId },
      data: { lastMessageId: created.id, updatedAt: new Date() },
    });
    return created;
  });

  return messageToDto(msg);
}

export async function getAttachmentForDownload(attachmentId: string, userId: string) {
  const row = await prisma.messageAttachment.findUnique({
    where: { id: attachmentId },
    include: { message: { select: { chatId: true } } },
  });
  if (!row) throw new Error("not_found");
  await assertChatMember(row.message.chatId, userId);
  return row;
}

export async function markChatRead(chatId: string, userId: string, messageId: string) {
  await assertChatMember(chatId, userId);
  const msg = await prisma.message.findFirst({
    where: { id: messageId, chatId },
    select: { id: true },
  });
  if (!msg) throw new Error("not_found");

  await prisma.chatMember.update({
    where: { chatId_userId: { chatId, userId } },
    data: { lastReadMessageId: messageId },
  });

  await prisma.messageReceipt.upsert({
    where: {
      messageId_userId_kind: { messageId, userId, kind: "read" },
    },
    create: { messageId, userId, kind: "read" },
    update: {},
  });

  return { ok: true as const, messageId };
}

export async function searchUsersForChat(q: string, limit = 20) {
  const term = q.trim();
  if (term.length < 2) return [];
  const rows = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: term, mode: "insensitive" } },
        { displayName: { contains: term, mode: "insensitive" } },
      ],
    },
    take: Math.min(limit, 30),
    select: { id: true, email: true, displayName: true },
    orderBy: { displayName: "asc" },
  });
  return rows;
}

export async function getChatMemberUserIds(chatId: string) {
  const rows = await prisma.chatMember.findMany({
    where: { chatId },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

const messageInclude = {
  author: { select: { id: true, displayName: true, email: true } },
  replyTo: { include: { author: { select: { id: true, displayName: true, email: true } } } },
  attachments: true,
} as const;

export type IncomingAttachment = {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
};

async function assertSupportChat(chatId: string, userId: string) {
  await assertChatMember(chatId, userId);
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { systemKey: true },
  });
  if (!chat || chat.systemKey !== "support") throw new Error("not_support_chat");
}

export function listSupportQuickCommands() {
  return listSupportQuickCommandsPublic();
}

export async function runSupportQuickCommand(chatId: string, userId: string, commandId: string) {
  await assertSupportChat(chatId, userId);
  const cmd = getSupportQuickCommand(commandId);
  if (!cmd) throw new Error("unknown_command");

  const pair = await prisma.$transaction(async (tx) => {
    const userMsg = await tx.message.create({
      data: {
        chatId,
        authorId: userId,
        kind: "text",
        text: cmd.userPrompt,
      },
      include: messageInclude,
    });
    const replyMsg = await tx.message.create({
      data: {
        chatId,
        kind: "system",
        text: cmd.response,
      },
      include: messageInclude,
    });
    await tx.chat.update({
      where: { id: chatId },
      data: { lastMessageId: replyMsg.id, updatedAt: new Date() },
    });
    return { userMsg, replyMsg };
  });

  return {
    userMessage: messageToDto(pair.userMsg),
    replyMessage: messageToDto(pair.replyMsg),
  };
}

async function repairChatLastMessage(chatId: string, tx: Prisma.TransactionClient) {
  const prev = await tx.message.findFirst({
    where: { chatId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  await tx.chat.update({
    where: { id: chatId },
    data: { lastMessageId: prev?.id ?? null, updatedAt: new Date() },
  });
}

export async function deleteChatMessage(
  chatId: string,
  messageId: string,
  userId: string,
  scope: "everyone" | "me",
  globalRole: string,
) {
  await assertChatMember(chatId, userId);
  const msg = await prisma.message.findFirst({
    where: { id: messageId, chatId },
    select: { id: true, authorId: true, deletedAt: true, kind: true },
  });
  if (!msg) throw new Error("not_found");

  if (scope === "me") {
    try {
      const existing = await prisma.messageHidden.findUnique({
        where: { messageId_userId: { messageId, userId } },
      });
      if (!existing) {
        await prisma.messageHidden.create({ data: { messageId, userId } });
      }
    } catch (e) {
      if (!isPrismaMissingTableError(e)) throw e;
    }
    return { scope: "me" as const, messageId };
  }

  if (msg.deletedAt) throw new Error("already_deleted");

  const member = await getChatMembership(chatId, userId);
  const canEveryone =
    msg.authorId === userId ||
    globalRole === "admin" ||
    member?.role === "owner" ||
    member?.role === "admin";
  if (!canEveryone) throw new Error("delete_forbidden");

  const message = await prisma.$transaction(async (tx) => {
    const updated = await tx.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
      include: messageInclude,
    });
    const chat = await tx.chat.findUnique({
      where: { id: chatId },
      select: { lastMessageId: true },
    });
    if (chat?.lastMessageId === messageId) {
      await repairChatLastMessage(chatId, tx);
    }
    return updated;
  });

  return { scope: "everyone" as const, message: messageToDto(message) };
}

export async function editChatMessage(
  chatId: string,
  messageId: string,
  userId: string,
  text: string,
) {
  await assertChatMember(chatId, userId);
  const trimmed = text.trim();
  if (!trimmed) throw new Error("bad_text");
  if (trimmed.length > MAX_MESSAGE_LEN) throw new Error("text_too_long");

  const msg = await prisma.message.findFirst({
    where: { id: messageId, chatId },
    select: { authorId: true, deletedAt: true, kind: true },
  });
  if (!msg) throw new Error("not_found");
  if (msg.deletedAt) throw new Error("already_deleted");
  if (msg.authorId !== userId) throw new Error("edit_forbidden");
  if (msg.kind === "system") throw new Error("edit_forbidden");

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { text: trimmed, editedAt: new Date() },
    include: messageInclude,
  });
  return messageToDto(updated);
}

const MAX_GROUP_AVATAR_URL_LEN = 1_200_000;

function assertIsGroupChat(chat: { kind: string } | null) {
  if (!chat || chat.kind !== "group") throw new Error("not_a_group");
}

export async function updateGroupAvatar(
  chatId: string,
  userId: string,
  avatarUrl: string | null,
) {
  await assertChatMember(chatId, userId);
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  assertIsGroupChat(chat);
  let nextUrl: string | null = null;
  if (avatarUrl !== null) {
    const v = avatarUrl.trim();
    if (!v.startsWith("data:image/")) throw new Error("bad_avatar");
    if (v.length > MAX_GROUP_AVATAR_URL_LEN) throw new Error("avatar_too_large");
    nextUrl = v;
  }
  const updated = await prisma.chat.update({
    where: { id: chatId },
    data: { avatarUrl: nextUrl },
    include: chatListInclude,
  });
  const member = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });
  const unread = member ? await countUnread(chatId, member) : 0;
  return chatToListItem(updated, userId, unread);
}

export async function addGroupMembers(
  chatId: string,
  userId: string,
  memberIds: string[],
) {
  await assertChatMember(chatId, userId);
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  assertIsGroupChat(chat);
  const unique = [...new Set(memberIds.map((id) => id.trim()).filter(Boolean))].filter(
    (id) => id !== userId,
  );
  if (unique.length === 0) throw new Error("no_members_to_add");

  const existing = await prisma.chatMember.findMany({
    where: { chatId },
    select: { userId: true },
  });
  const existingSet = new Set(existing.map((m) => m.userId));
  const toAdd = unique.filter((id) => !existingSet.has(id));
  if (toAdd.length === 0) throw new Error("members_already_in_chat");

  const users = await prisma.user.findMany({
    where: { id: { in: toAdd } },
    select: { id: true },
  });
  if (users.length !== toAdd.length) throw new Error("user_not_found");

  await prisma.chatMember.createMany({
    data: toAdd.map((uid) => ({ chatId, userId: uid, role: "member" })),
  });

  const updated = await prisma.chat.findUnique({
    where: { id: chatId },
    include: chatListInclude,
  });
  if (!updated) throw new Error("not_found");
  const member = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });
  const unread = member ? await countUnread(chatId, member) : 0;
  return chatToListItem(updated, userId, unread);
}

export async function leaveGroupChat(chatId: string, userId: string) {
  await assertChatMember(chatId, userId);
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { members: true },
  });
  assertIsGroupChat(chat);
  const leaving = chat!.members.find((m) => m.userId === userId);
  if (!leaving) throw new Error("not_found");

  const notifyIds = chat!.members.map((m) => m.userId);

  await prisma.$transaction(async (tx) => {
    await tx.chatMember.delete({ where: { chatId_userId: { chatId, userId } } });
    const remaining = await tx.chatMember.findMany({ where: { chatId } });
    if (remaining.length === 0) {
      await tx.chat.delete({ where: { id: chatId } });
      return;
    }
    if (leaving.role === "owner") {
      await tx.chatMember.update({
        where: { id: remaining[0]!.id },
        data: { role: "owner" },
      });
    }
  });

  const stillExists = await prisma.chat.findUnique({ where: { id: chatId }, select: { id: true } });
  return { removed: true, chatDeleted: !stillExists, notifyUserIds: notifyIds };
}

export async function deleteGroupChat(chatId: string, userId: string) {
  await assertChatMember(chatId, userId);
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { members: { select: { userId: true } } },
  });
  assertIsGroupChat(chat);
  if (!chat!.createdById || chat!.createdById !== userId) throw new Error("delete_forbidden");
  const notifyUserIds = chat!.members.map((m) => m.userId);
  await prisma.chat.delete({ where: { id: chatId } });
  return { removed: true, notifyUserIds };
}
