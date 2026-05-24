import type { Editor } from "@tiptap/react";

export type StickerTableCommand =
  | "insertTable"
  | "addRowAfter"
  | "addColumnAfter"
  | "deleteRow"
  | "deleteColumn"
  | "mergeCells"
  | "splitCell";

export function runStickerTipTapTableCommand(editor: Editor, command: StickerTableCommand): boolean {
  const chain = editor.chain().focus();
  switch (command) {
    case "insertTable":
      return chain.insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run();
    case "addRowAfter":
      return chain.addRowAfter().run();
    case "addColumnAfter":
      return chain.addColumnAfter().run();
    case "deleteRow":
      return chain.deleteRow().run();
    case "deleteColumn":
      return chain.deleteColumn().run();
    case "mergeCells":
      return chain.mergeCells().run();
    case "splitCell":
      return chain.splitCell().run();
    default:
      return false;
  }
}

/** После правок DOM таблицы (merge/split) — пересобрать документ TipTap. */
export function syncStickerTipTapFromDom(editor: Editor): void {
  const root = editor.view.dom;
  const html = root.innerHTML;
  editor.commands.setContent(html, { emitUpdate: true });
}
