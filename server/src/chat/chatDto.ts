import type { Chat, ChatMember, Message, MessageAttachment, User } from "@prisma/client";
import { isPreviewableMime } from "./attachmentPolicy.js";

export type ChatAuthorDto = {
  id: string;
  displayName: string;
  email: string;
};

export type MessageAttachmentDto = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
  previewable: boolean;
};

export type MessageDto = {
  id: string;
  chatId: string;
  kind: string;
  text: string;
  replyToMessageId: string | null;
  clientMessageId: string | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  author: ChatAuthorDto | null;
  replyPreview: { id: string; text: string; authorName: string } | null;
  attachments: MessageAttachmentDto[];
};

export function attachmentToDto(a: MessageAttachment): MessageAttachmentDto {
  return {
    id: a.id,
    originalName: a.originalName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    downloadUrl: `/api/chat/attachments/${a.id}`,
    previewable: isPreviewableMime(a.mimeType),
  };
}

export type ChatListItemDto = {
  id: string;
  kind: string;
  title: string;
  description: string;
  avatarUrl: string | null;
  systemKey: string | null;
  isSaved: boolean;
  createdById: string | null;
  viewerRole: string | null;
  isGroupCreator: boolean;
  updatedAt: string;
  unreadCount: number;
  lastMessage: {
    id: string;
    text: string;
    createdAt: string;
    authorName: string;
  } | null;
  members: Array<{ userId: string; displayName: string; role: string }>;
};

type MessageWithAuthor = Message & {
  author: Pick<User, "id" | "displayName" | "email"> | null;
  replyTo: (Message & { author: Pick<User, "id" | "displayName" | "email"> | null }) | null;
  attachments?: MessageAttachment[];
};

export function messageToDto(m: MessageWithAuthor): MessageDto {
  return {
    id: m.id,
    chatId: m.chatId,
    kind: m.kind,
    text: m.deletedAt ? "" : m.text,
    replyToMessageId: m.replyToMessageId,
    clientMessageId: m.clientMessageId,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
    deletedAt: m.deletedAt?.toISOString() ?? null,
    author: m.author
      ? { id: m.author.id, displayName: m.author.displayName, email: m.author.email }
      : null,
    replyPreview: m.replyTo
      ? {
          id: m.replyTo.id,
          text: m.replyTo.deletedAt ? "" : m.replyTo.text.slice(0, 200),
          authorName: m.replyTo.author?.displayName || "Участник",
        }
      : null,
    attachments: (m.attachments ?? []).map(attachmentToDto),
  };
}

type ChatWithMembers = Chat & {
  members: (ChatMember & { user: Pick<User, "id" | "displayName" | "email"> })[];
  lastMessage:
    | (Message & { author: Pick<User, "id" | "displayName" | "email"> | null })
    | null;
};

export function chatToListItem(
  chat: ChatWithMembers,
  viewerId: string,
  unreadCount: number,
): ChatListItemDto {
  const title =
    chat.kind === "direct"
      ? chat.members.filter((m) => m.userId !== viewerId).map((m) => m.user.displayName || m.user.email)[0] ||
        "Личный чат"
      : chat.title;

  const viewerMember = chat.members.find((m) => m.userId === viewerId);

  return {
    id: chat.id,
    kind: chat.kind,
    title,
    description: chat.description,
    avatarUrl: chat.avatarUrl,
    systemKey: chat.systemKey,
    isSaved: !!chat.directKey?.startsWith("saved:"),
    createdById: chat.createdById,
    viewerRole: viewerMember?.role ?? null,
    isGroupCreator:
      chat.kind === "group" && !!chat.createdById && chat.createdById === viewerId,
    updatedAt: chat.updatedAt.toISOString(),
    unreadCount,
    lastMessage: chat.lastMessage
      ? {
          id: chat.lastMessage.id,
          text: chat.lastMessage.deletedAt
            ? "Сообщение удалено"
            : chat.lastMessage.text.trim().slice(0, 120) ||
              (chat.lastMessage.kind === "file" ? "📎 Вложение" : ""),
          createdAt: chat.lastMessage.createdAt.toISOString(),
          authorName: chat.lastMessage.author?.displayName || "Система",
        }
      : null,
    members: chat.members.map((m) => ({
      userId: m.userId,
      displayName: m.user.displayName || m.user.email,
      role: m.role,
    })),
  };
}
