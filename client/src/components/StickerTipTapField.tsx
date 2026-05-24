import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { createStickerEditorApi, type StickerEditorApi } from "../lib/stickerTipTap/api";
import { createStickerTipTapExtensions } from "../lib/stickerTipTap/extensions";

type Props = {
  cardId: string;
  initialHtml: string;
  className?: string;
  style?: React.CSSProperties;
  spellCheck?: boolean;
  onHtmlChange: (cardId: string, html: string) => void;
  onRegister: (cardId: string, api: StickerEditorApi | null) => void;
  onKeyDown?: (cardId: string, e: React.KeyboardEvent) => void;
  onLinkClick?: (e: React.MouseEvent) => void;
  onPaste?: (cardId: string, e: React.ClipboardEvent) => void;
  onBlur?: (cardId: string, e: React.FocusEvent) => void;
};

export function StickerTipTapField({
  cardId,
  initialHtml,
  className = "",
  style,
  spellCheck = true,
  onHtmlChange,
  onRegister,
  onKeyDown,
  onLinkClick,
  onPaste,
  onBlur,
}: Props) {
  const onHtmlChangeRef = useRef(onHtmlChange);
  onHtmlChangeRef.current = onHtmlChange;

  const editor = useEditor({
    extensions: createStickerTipTapExtensions(),
    content: initialHtml?.trim() ? initialHtml : "<p></p>",
    enableInputRules: true,
    enablePasteRules: true,
    editorProps: {
      attributes: {
        class: `sticker-tiptap prose prose-sm max-w-none focus:outline-none ${className}`.trim(),
        spellcheck: spellCheck ? "true" : "false",
        "data-sticker-editor": "true",
      },
      handleDOMEvents: {
        keydown: (_view, event) => {
          onKeyDown?.(cardId, event as unknown as React.KeyboardEvent);
          return false;
        },
      },
    },
    onUpdate: ({ editor: ed }) => {
      onHtmlChangeRef.current(cardId, ed.getHTML());
    },
    onBlur: ({ event }) => {
      onBlur?.(cardId, event as unknown as React.FocusEvent);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const api = createStickerEditorApi(editor);
    onRegister(cardId, api);
    return () => onRegister(cardId, null);
  }, [editor, cardId, onRegister]);

  useEffect(() => {
    if (!editor) return;
    const next = initialHtml?.trim() ? initialHtml : "<p></p>";
    const cur = editor.getHTML();
    if (next !== cur && !editor.isFocused) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [cardId, initialHtml, editor]);

  if (!editor) return null;

  return (
    <div
      className="sticker-tiptap-root h-full w-full min-h-0"
      style={style}
      onClick={onLinkClick}
      onPaste={(e) => onPaste?.(cardId, e)}
      onWheel={(e) => e.stopPropagation()}
    >
      <EditorContent editor={editor} className="h-full w-full" />
    </div>
  );
}
