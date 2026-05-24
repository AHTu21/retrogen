import type { Editor } from "@tiptap/react";

/** Маппинг legacy execCommand → TipTap (панель RoomPage). */
export function runStickerTipTapCommand(editor: Editor, command: string, value?: string): boolean {
  const chain = editor.chain().focus();

  switch (command) {
    case "bold":
      return chain.toggleBold().run();
    case "italic":
      return chain.toggleItalic().run();
    case "underline":
      return chain.toggleUnderline().run();
    case "strikeThrough":
      return chain.toggleStrike().run();
    case "superscript":
      return chain.toggleSuperscript().run();
    case "subscript":
      return chain.toggleSubscript().run();
    case "insertUnorderedList":
      return chain.toggleBulletList().run();
    case "insertOrderedList":
      return chain.toggleOrderedList().run();
    case "indent":
      return chain.sinkListItem("listItem").run();
    case "outdent":
      return chain.liftListItem("listItem").run();
    case "justifyLeft":
      return chain.setTextAlign("left").run();
    case "justifyCenter":
      return chain.setTextAlign("center").run();
    case "justifyRight":
      return chain.setTextAlign("right").run();
    case "formatBlock":
      if (value === "blockquote") return chain.toggleBlockquote().run();
      if (value === "pre" || value === "code") {
        return chain.toggleCodeBlock().run();
      }
      return false;
    case "insertHorizontalRule":
      return chain.setHorizontalRule().run();
    case "unlink":
      return chain.unsetLink().run();
    case "removeFormat":
      return chain.clearNodes().unsetAllMarks().run();
    case "foreColor":
      if (value) return chain.setColor(value).run();
      return false;
    case "fontName":
      if (value) return chain.setFontFamily(value).run();
      return false;
    case "fontSize":
      if (value) return chain.setMark("textStyle", { fontSize: value }).run();
      return false;
    case "hiliteColor":
    case "backColor":
      if (value) return chain.setHighlight({ color: value }).run();
      return false;
    case "createLink":
      if (value) return chain.setLink({ href: value }).run();
      return false;
    default:
      return false;
  }
}

export function insertStickerTipTapHtml(editor: Editor, html: string): void {
  editor.chain().focus().insertContent(html).run();
}

export function insertStickerTipTapText(editor: Editor, text: string): void {
  editor.chain().focus().insertContent(text).run();
}

export function setStickerTipTapHighlight(editor: Editor, color: string): void {
  editor.chain().focus().setHighlight({ color }).run();
}

export function applyStickerTipTapLink(editor: Editor, href: string): void {
  const chain = editor.chain().focus();
  if (editor.isActive("link")) {
    chain.extendMarkRange("link").setLink({ href }).run();
  } else {
    chain.setLink({ href }).run();
  }
}

export function readStickerTipTapLinkHref(editor: Editor): string {
  const attrs = editor.getAttributes("link");
  return (attrs.href as string | undefined) ?? "https://";
}

export function stickerTipTapUndo(editor: Editor): boolean {
  return editor.chain().focus().undo().run();
}

export function stickerTipTapRedo(editor: Editor): boolean {
  return editor.chain().focus().redo().run();
}
