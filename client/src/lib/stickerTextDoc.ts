import type { JSONContent } from "@tiptap/core";

/** Корневой узел документа TipTap / ProseMirror. */
export function isStickerTextDoc(value: unknown): value is JSONContent {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as JSONContent).type === "doc" &&
    Array.isArray((value as JSONContent).content)
  );
}

export type StickerCardTextSource = {
  text: string;
  textDoc?: unknown | null;
};

/** Контент для `useEditor({ content })`: JSON приоритетнее HTML. */
export function stickerCardEditorContent(
  card: StickerCardTextSource,
  draftHtml?: string,
): string | JSONContent {
  if (typeof draftHtml === "string" && draftHtml.length > 0) {
    return draftHtml.trim() ? draftHtml : "<p></p>";
  }
  if (card.textDoc != null && isStickerTextDoc(card.textDoc)) {
    return card.textDoc;
  }
  const html = card.text?.trim();
  return html ? html : "<p></p>";
}
