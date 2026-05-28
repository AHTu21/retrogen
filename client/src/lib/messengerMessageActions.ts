import type { AuthUserDto } from "../api";
import type { ChatListItemDto, MessageDto } from "../types/messenger";

export function canDeleteMessageForEveryone(
  message: MessageDto,
  me: AuthUserDto,
  chat: ChatListItemDto | null,
): boolean {
  if (!chat || message.deletedAt || message.id.startsWith("tmp-")) return false;
  if (message.author?.id === me.id) return true;
  if (me.globalRole === "admin") return true;
  const member = chat.members.find((m) => m.userId === me.id);
  return member?.role === "owner" || member?.role === "admin";
}

export function canEditMessage(message: MessageDto, me: AuthUserDto): boolean {
  return (
    message.author?.id === me.id &&
    !message.deletedAt &&
    !message.id.startsWith("tmp-") &&
    message.kind !== "system"
  );
}

export function canReplyToMessage(message: MessageDto): boolean {
  return !message.deletedAt && !message.id.startsWith("tmp-");
}

export function canOpenMessageContextMenu(message: MessageDto): boolean {
  return !message.id.startsWith("tmp-");
}

export function replyPreviewText(message: MessageDto): string {
  if (message.deletedAt) return "Сообщение удалено";
  const t = message.text.trim();
  if (t) return t.length > 120 ? `${t.slice(0, 120)}…` : t;
  const first = message.attachments?.[0];
  if (first) return `📎 ${first.originalName}`;
  return "Сообщение";
}
