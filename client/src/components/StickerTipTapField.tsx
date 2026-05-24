import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { isStickerTextDoc } from "../lib/stickerTextDoc";
import type { StickerCollabProvider } from "../lib/stickerCollab/StickerCollabProvider";
import { createStickerEditorApi, type StickerEditorApi } from "../lib/stickerTipTap/api";
import { createStickerTipTapExtensions } from "../lib/stickerTipTap/extensions";

export type StickerTipTapCollabProps = {
  provider: StickerCollabProvider;
  user: { name: string; color: string };
  seedContent: string | JSONContent;
};

type Props = {
  cardId: string;
  /** HTML-черновик или JSON-документ с сервера (`textDoc`). Игнорируется при `collab`. */
  initialContent: string | JSONContent;
  collab?: StickerTipTapCollabProps;
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

function seedStickerEditor(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  seed: string | JSONContent,
) {
  if (isStickerTextDoc(seed)) {
    editor.commands.setContent(seed, { emitUpdate: false });
    return;
  }
  editor.commands.setContent(seed?.trim() ? seed : "<p></p>", { emitUpdate: false });
}

export function StickerTipTapField({
  cardId,
  initialContent,
  collab,
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
  const seededCollabRef = useRef(false);
  const collabSeed = collab?.seedContent;

  const editor = useEditor(
    {
      extensions: createStickerTipTapExtensions(
        collab
          ? {
              document: collab.provider.ydoc,
              provider: collab.provider,
              user: collab.user,
            }
          : undefined,
      ),
      content: collab
        ? undefined
        : isStickerTextDoc(initialContent)
          ? initialContent
          : initialContent?.trim()
            ? initialContent
            : "<p></p>",
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
      onCreate: ({ editor: ed }) => {
        if (!collab || seededCollabRef.current) return;
        if (!ed.isEmpty) return;
        seedStickerEditor(ed, collabSeed ?? initialContent);
        seededCollabRef.current = true;
      },
      onUpdate: ({ editor: ed }) => {
        onHtmlChangeRef.current(cardId, ed.getHTML());
      },
      onBlur: ({ event }) => {
        onBlur?.(cardId, event as unknown as React.FocusEvent);
      },
    },
    [collab ? collab.provider : null, cardId],
  );

  useEffect(() => {
    seededCollabRef.current = false;
  }, [cardId, collab?.provider]);

  useEffect(() => {
    if (!editor) return;
    const api = createStickerEditorApi(editor);
    onRegister(cardId, api);
    return () => onRegister(cardId, null);
  }, [editor, cardId, onRegister]);

  useEffect(() => {
    if (!editor || collab || editor.isFocused) return;
    if (isStickerTextDoc(initialContent)) {
      const cur = JSON.stringify(editor.getJSON());
      const next = JSON.stringify(initialContent);
      if (cur !== next) editor.commands.setContent(initialContent, { emitUpdate: false });
      return;
    }
    const next = initialContent?.trim() ? initialContent : "<p></p>";
    if (next !== editor.getHTML()) editor.commands.setContent(next, { emitUpdate: false });
  }, [cardId, initialContent, editor, collab]);

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
