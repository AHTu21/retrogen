const STORAGE_KEY = "retrogen:messenger:hidden";

function readAll(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, string[]>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getHiddenMessageIds(chatId: string): Set<string> {
  const all = readAll();
  return new Set(all[chatId] ?? []);
}

export function hideMessageForMe(chatId: string, messageId: string): void {
  const all = readAll();
  const list = new Set(all[chatId] ?? []);
  list.add(messageId);
  all[chatId] = [...list];
  writeAll(all);
}

export function filterVisibleMessages<T extends { id: string }>(chatId: string, rows: T[]): T[] {
  const hidden = getHiddenMessageIds(chatId);
  if (hidden.size === 0) return rows;
  return rows.filter((m) => !hidden.has(m.id));
}
