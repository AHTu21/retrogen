/** Нормализация и статистика содержимого блокнота (plain text или HTML TipTap). */

export const NOTEPAD_MAX_PLAIN_CHARS = 12_000;

export function isNotepadHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value.trim());
}

/** Статистика по «видимому» тексту — для лимита и счётчиков. */
export function notepadPlainText(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (!isNotepadHtml(raw)) return raw;
  if (typeof document !== "undefined") {
    const html = raw
      .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, "$&\n")
      .replace(/<br\s*\/?>/gi, "\n");
    const el = document.createElement("div");
    el.innerHTML = html;
    const text = (el.textContent ?? "").replace(/\r\n/g, "\n");
    return text.replace(/\n{3,}/g, "\n\n").trim();
  }
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function escapeNotepadHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Миграция старых plain-text заметок в HTML для TipTap. */
export function plainTextToNotepadHtml(text: string): string {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      chunks.push("</ul>");
      listOpen = false;
    }
  };

  for (const line of lines) {
    const bullet = line.match(/^(\s*)([-•*]|\d+\.)\s+(.*)$/);
    if (bullet) {
      if (!listOpen) {
        chunks.push("<ul>");
        listOpen = true;
      }
      chunks.push(`<li><p>${escapeNotepadHtml(bullet[3])}</p></li>`);
      continue;
    }
    closeList();
    if (!line.trim()) {
      chunks.push("<p></p>");
    } else {
      chunks.push(`<p>${escapeNotepadHtml(line)}</p>`);
    }
  }
  closeList();
  return chunks.join("") || "<p></p>";
}

export function normalizeNotepadForEditor(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "<p></p>";
  if (isNotepadHtml(trimmed)) return trimmed;
  return plainTextToNotepadHtml(raw);
}

/** Безопасная подготовка HTML перед TipTap (битый localStorage не роняет страницу). */
export function safeNotepadEditorContent(raw: string): string {
  try {
    const html = normalizeNotepadForEditor(raw);
    if (typeof document === "undefined") return html;
    const el = document.createElement("div");
    el.innerHTML = html;
    return el.innerHTML.trim() ? html : "<p></p>";
  } catch {
    const plain = raw.trim();
    if (!plain) return "<p></p>";
    if (!isNotepadHtml(plain)) return plainTextToNotepadHtml(plain);
    return "<p></p>";
  }
}

export function notepadStatsFromContent(content: string) {
  const plain = notepadPlainText(content);
  const trimmed = plain.trim();
  const lines = plain.length ? plain.split(/\n/).length : 0;
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  return { chars: plain.length, words, lines };
}

export function isNotepadOverLimit(content: string, max = NOTEPAD_MAX_PLAIN_CHARS): boolean {
  return notepadStatsFromContent(content).chars > max;
}
