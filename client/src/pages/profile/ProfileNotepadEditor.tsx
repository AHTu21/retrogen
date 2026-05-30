import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { createNotepadTipTapExtensions } from "../../lib/notepadTipTapExtensions";
import {
  NOTEPAD_MAX_PLAIN_CHARS,
  notepadPlainText,
  safeNotepadEditorContent,
} from "../../lib/profileNotepadContent";
import { runStickerTipTapTableCommand } from "../../lib/stickerTipTap/tableCommands";
import type { ProfileDesign } from "./profileDesign";
import { ProfileControlHint } from "./profileControlHint";
import { NOTEPAD_PLACEHOLDER, NOTEPAD_SNIPPETS, type NotepadSnippet } from "./profileNotepadPresets";

type ToolbarBtn = {
  id: string;
  hint: string;
  icon: string;
  active?: (ed: Editor) => boolean;
  run: (ed: Editor) => void;
  disabled?: (ed: Editor) => boolean;
};

const FORMAT_BTNS: ToolbarBtn[] = [
  {
    id: "bold",
    hint: "Жирный (Ctrl+B)",
    icon: "B",
    active: (ed) => ed.isActive("bold"),
    run: (ed) => ed.chain().focus().toggleBold().run(),
  },
  {
    id: "italic",
    hint: "Курсив (Ctrl+I)",
    icon: "I",
    active: (ed) => ed.isActive("italic"),
    run: (ed) => ed.chain().focus().toggleItalic().run(),
  },
  {
    id: "h2",
    hint: "Подзаголовок",
    icon: "H2",
    active: (ed) => ed.isActive("heading", { level: 2 }),
    run: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "bullet",
    hint: "Маркированный список — Tab для вложенности",
    icon: "•",
    active: (ed) => ed.isActive("bulletList"),
    run: (ed) => ed.chain().focus().toggleBulletList().run(),
  },
  {
    id: "ordered",
    hint: "Нумерованный список",
    icon: "1.",
    active: (ed) => ed.isActive("orderedList"),
    run: (ed) => ed.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "quote",
    hint: "Цитата",
    icon: "❝",
    active: (ed) => ed.isActive("blockquote"),
    run: (ed) => ed.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "table",
    hint: "Вставить таблицу 3×3",
    icon: "⊞",
    run: (ed) => {
      ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    id: "row",
    hint: "Добавить строку в таблице",
    icon: "↵",
    disabled: (ed) => !ed.can().addRowAfter(),
    run: (ed) => runStickerTipTapTableCommand(ed, "addRowAfter"),
  },
  {
    id: "col",
    hint: "Добавить столбец в таблице",
    icon: "‖",
    disabled: (ed) => !ed.can().addColumnAfter(),
    run: (ed) => runStickerTipTapTableCommand(ed, "addColumnAfter"),
  },
];

function NotepadToolbar({
  d,
  editor,
  onSnippet,
  onFullscreen,
  fullscreen,
  onCopy,
  onClear,
  copied,
  canClear,
}: {
  d: ProfileDesign;
  editor: Editor | null;
  onSnippet: (s: NotepadSnippet) => void;
  onFullscreen: () => void;
  fullscreen: boolean;
  onCopy: () => void;
  onClear: () => void;
  copied: boolean;
  canClear: boolean;
}) {
  const btnClass = (active?: boolean) =>
    `inline-flex h-8 min-w-8 items-center justify-center px-1.5 text-[0.75rem] font-medium transition ${d.rSm} ${
      active
        ? "bg-[var(--ph-nav-active-bg)] text-[var(--ph-nav-active-text)] ring-1 ring-[var(--ph-accent)]/40"
        : "text-[var(--ph-text)] hover:bg-[var(--ph-nav-hover)] ring-1 ring-transparent hover:ring-[var(--ph-border)]"
    } disabled:opacity-35 disabled:pointer-events-none`;

  return (
    <div className="flex flex-col gap-2 border-b border-[var(--ph-separator)] bg-[var(--ph-surface-elevated)] px-2 py-2 sm:px-3">
      <div className="flex flex-wrap items-center gap-1">
        {FORMAT_BTNS.map((b) => (
          <ProfileControlHint key={b.id} hint={b.hint}>
            <button
              type="button"
              className={btnClass(editor ? b.active?.(editor) : false)}
              disabled={!editor || (editor && b.disabled?.(editor))}
              onClick={() => editor && b.run(editor)}
              aria-label={b.hint}
              aria-pressed={editor ? b.active?.(editor) : false}
            >
              {b.icon}
            </button>
          </ProfileControlHint>
        ))}
        <span className="mx-0.5 h-5 w-px bg-[var(--ph-separator)]" aria-hidden />
        <ProfileControlHint hint={fullscreen ? "Выйти из полноэкранного режима (Esc)" : "Полноэкранный режим"}>
          <button type="button" className={btnClass(false)} onClick={onFullscreen} aria-label="Полный экран">
            {fullscreen ? "⤡" : "⤢"}
          </button>
        </ProfileControlHint>
        <ProfileControlHint hint="Копировать текст заметок">
          <button type="button" className={`${d.btnGhost} !h-8 !min-h-8 !px-2.5`} onClick={onCopy}>
            {copied ? "✓" : "Копир."}
          </button>
        </ProfileControlHint>
        <ProfileControlHint hint="Очистить весь блокнот">
          <button
            type="button"
            className={`${d.btnGhost} !h-8 !min-h-8 !px-2.5 text-red-600 dark:text-red-400`}
            disabled={!canClear}
            onClick={onClear}
          >
            Очистить
          </button>
        </ProfileControlHint>
      </div>
      <div className="flex flex-wrap gap-1">
        {NOTEPAD_SNIPPETS.map((snippet) => (
          <ProfileControlHint key={snippet.id} hint={`Вставить: ${snippet.label}`}>
            <button
              type="button"
              className={`inline-flex h-7 items-center gap-1 px-2 text-[0.6875rem] font-medium ${d.rSm} bg-[var(--ph-surface)] ring-1 ring-[var(--ph-border)] hover:bg-[var(--ph-nav-hover)]`}
              disabled={!editor}
              onClick={() => onSnippet(snippet)}
            >
              <span aria-hidden>{snippet.icon}</span>
              {snippet.label}
            </button>
          </ProfileControlHint>
        ))}
      </div>
    </div>
  );
}

type EditorShellProps = {
  d: ProfileDesign;
  editor: Editor | null;
  fullscreen: boolean;
  onFullscreen: () => void;
  onCopy: () => void;
  onClear: () => void;
  copied: boolean;
  canClear: boolean;
  plainChars: number;
  onSnippet: (s: NotepadSnippet) => void;
  limitWarn: boolean;
  themeStyle: CSSProperties;
};

function EditorShell({
  d,
  editor,
  fullscreen,
  onFullscreen,
  onCopy,
  onClear,
  copied,
  canClear,
  plainChars,
  onSnippet,
  limitWarn,
  themeStyle,
}: EditorShellProps) {
  const shell = (
    <div
      className={`flex min-w-0 flex-col overflow-hidden ${d.insetGroup} ${
        fullscreen ? "h-full max-h-none rounded-none ring-0" : ""
      }`}
    >
      <NotepadToolbar
        d={d}
        editor={editor}
        onSnippet={onSnippet}
        onFullscreen={onFullscreen}
        fullscreen={fullscreen}
        onCopy={onCopy}
        onClear={onClear}
        copied={copied}
        canClear={canClear}
      />
      <div className={`min-h-0 flex-1 bg-[var(--ph-notepad-bg)] ${fullscreen ? "overflow-y-auto" : ""}`}>
        {editor ? (
          <EditorContent
            editor={editor}
            className={`profile-notepad-tiptap px-4 py-3 ${fullscreen ? "min-h-[calc(100dvh-8.5rem)]" : "min-h-[min(20rem,50vh)]"}`}
          />
        ) : (
          <div className={`flex min-h-[min(20rem,50vh)] items-center justify-center px-4 text-[0.8125rem] ${d.muted}`}>
            Подготовка редактора…
          </div>
        )}
      </div>
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ph-separator)] bg-[var(--ph-notepad-bg)] px-4 py-2 text-[0.6875rem] ${d.muted}`}
      >
        <span>Tab — вложенность списков · таблицы в панели</span>
        <span className={`tabular-nums ${limitWarn ? "font-medium text-amber-600 dark:text-amber-400" : ""}`}>
          {plainChars.toLocaleString("ru-RU")} / {NOTEPAD_MAX_PLAIN_CHARS.toLocaleString("ru-RU")}
        </span>
      </div>
    </div>
  );

  if (!fullscreen || typeof document === "undefined") return shell;

  return createPortal(
    <div
      className={`profile-app fixed inset-0 z-[800] flex flex-col antialiased ${d.page}`}
      style={themeStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Блокнот — полный экран"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--ph-border)] bg-[var(--ph-sticky-bg)] px-4 py-2.5 backdrop-blur">
        <p className="text-[0.875rem] font-semibold text-[var(--ph-text)]">Блокнот — полный экран</p>
        <button type="button" className={d.btnSecondary} onClick={onFullscreen}>
          Закрыть (Esc)
        </button>
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-3 py-3 sm:px-4">{shell}</div>
    </div>,
    document.body,
  );
}

export function ProfileNotepadEditor({
  d,
  value,
  onChange,
  themeStyle,
}: {
  d: ProfileDesign;
  value: string;
  onChange: (html: string) => void;
  themeStyle: CSSProperties;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [plainChars, setPlainChars] = useState(() => notepadPlainText(value).length);
  const lastGoodHtml = useRef(safeNotepadEditorContent(value));
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const extensions = useMemo(() => createNotepadTipTapExtensions(NOTEPAD_PLACEHOLDER), []);

  const editor = useEditor(
    {
      extensions,
      content: lastGoodHtml.current,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            "profile-notepad-tiptap-editor focus:outline-none min-h-[12rem] text-[0.9375rem] text-[var(--ph-text)]",
          spellcheck: "true",
        },
      },
      onUpdate: ({ editor: ed }) => {
        const html = ed.getHTML();
        const plain = notepadPlainText(html);
        if (plain.length > NOTEPAD_MAX_PLAIN_CHARS) {
          ed.commands.setContent(lastGoodHtml.current, { emitUpdate: false });
          return;
        }
        lastGoodHtml.current = html;
        setPlainChars(plain.length);
        onChangeRef.current(html);
      },
    },
    [extensions],
  );

  useEffect(() => {
    if (!editor) return;
    const normalized = safeNotepadEditorContent(value);
    if (notepadPlainText(editor.getHTML()) === notepadPlainText(value)) return;
    try {
      editor.commands.setContent(normalized, { emitUpdate: false });
      lastGoodHtml.current = normalized;
      setPlainChars(notepadPlainText(normalized).length);
    } catch {
      editor.commands.setContent("<p></p>", { emitUpdate: false });
      lastGoodHtml.current = "<p></p>";
      setPlainChars(0);
    }
  }, [editor, value]);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const applySnippet = useCallback(
    (snippet: NotepadSnippet) => {
      if (!editor) return;
      const content = snippet.html ?? plainSnippetToHtml(snippet.text);
      editor.chain().focus().insertContent(content).run();
    },
    [editor],
  );

  const onCopy = async () => {
    const plain = editor ? notepadPlainText(editor.getHTML()) : notepadPlainText(value);
    if (!plain.trim()) return;
    try {
      await navigator.clipboard.writeText(plain);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const onClear = () => {
    if (!editor) return;
    const plain = notepadPlainText(editor.getHTML());
    if (!plain.trim()) return;
    if (window.confirm("Очистить весь блокнот? Это действие нельзя отменить.")) {
      editor.commands.setContent("<p></p>");
      onChange("<p></p>");
      editor.commands.focus();
    }
  };

  const limitWarn = plainChars >= NOTEPAD_MAX_PLAIN_CHARS * 0.85;

  if (fullscreen) {
    return (
      <>
        <div
          className={`flex min-h-[4rem] items-center justify-center ${d.insetGroup} bg-[var(--ph-surface-elevated)] text-[0.8125rem] ${d.muted}`}
        >
          Редактирование в полноэкранном режиме — Esc или «Закрыть»
        </div>
        <EditorShell
          d={d}
          editor={editor}
          fullscreen={fullscreen}
          onFullscreen={() => setFullscreen(false)}
          onCopy={() => void onCopy()}
          onClear={onClear}
          copied={copied}
          canClear={plainChars > 0}
          plainChars={plainChars}
          onSnippet={applySnippet}
          limitWarn={limitWarn}
          themeStyle={themeStyle}
        />
      </>
    );
  }

  return (
    <EditorShell
      d={d}
      editor={editor}
      fullscreen={false}
      onFullscreen={() => setFullscreen(true)}
      onCopy={() => void onCopy()}
      onClear={onClear}
      copied={copied}
      canClear={plainChars > 0}
      plainChars={plainChars}
      onSnippet={applySnippet}
      limitWarn={limitWarn}
      themeStyle={themeStyle}
    />
  );
}

function plainSnippetToHtml(text: string): string {
  const lines = text.split("\n");
  return lines
    .map((line) => {
      const bullet = line.match(/^(\d+\.|[-•*])\s+(.*)$/);
      if (bullet) return `<li><p>${escapeHtml(bullet[2])}</p></li>`;
      return line.trim() ? `<p>${escapeHtml(line)}</p>` : "<p></p>";
    })
    .join("");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
