import type { Editor } from "@tiptap/react";
import {
  applyStickerTipTapLink,
  insertStickerTipTapHtml,
  insertStickerTipTapText,
  readStickerTipTapLinkHref,
  runStickerTipTapCommand,
  setStickerTipTapHighlight,
  stickerTipTapRedo,
  stickerTipTapUndo,
} from "./commands";
import { runStickerTipTapTableCommand, syncStickerTipTapFromDom, type StickerTableCommand } from "./tableCommands";

export type StickerEditorApi = {
  focus: () => void;
  blur: () => void;
  getHtml: () => string;
  setHtml: (html: string) => void;
  getDom: () => HTMLElement;
  getEditor: () => Editor;
  runCommand: (command: string, value?: string) => boolean;
  insertHtml: (html: string) => void;
  insertText: (text: string) => void;
  setHighlight: (color: string) => void;
  applyLink: (href: string) => void;
  readLinkHref: () => string;
  undo: () => boolean;
  redo: () => boolean;
  runTableCommand: (command: StickerTableCommand) => boolean;
  syncFromDom: () => void;
};

export function createStickerEditorApi(editor: Editor): StickerEditorApi {
  return {
    focus: () => {
      editor.commands.focus("end");
    },
    blur: () => {
      editor.commands.blur();
    },
    getHtml: () => editor.getHTML(),
    setHtml: (html: string) => {
      editor.commands.setContent(html || "<p></p>", { emitUpdate: false });
    },
    getDom: () => editor.view.dom as HTMLElement,
    getEditor: () => editor,
    runCommand: (command, value) => runStickerTipTapCommand(editor, command, value),
    insertHtml: (html) => insertStickerTipTapHtml(editor, html),
    insertText: (text) => insertStickerTipTapText(editor, text),
    setHighlight: (color) => setStickerTipTapHighlight(editor, color),
    applyLink: (href) => applyStickerTipTapLink(editor, href),
    readLinkHref: () => readStickerTipTapLinkHref(editor),
    undo: () => stickerTipTapUndo(editor),
    redo: () => stickerTipTapRedo(editor),
    runTableCommand: (command) => runStickerTipTapTableCommand(editor, command),
    syncFromDom: () => syncStickerTipTapFromDom(editor),
  };
}
