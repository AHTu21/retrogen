/** Системные каналы с ключом `news` — только чтение; `support` — пользователи могут писать. */
export function canWriteToChat(chat: { kind: string; systemKey: string | null }): boolean {
  if (chat.kind !== "system") return true;
  return chat.systemKey === "support";
}
