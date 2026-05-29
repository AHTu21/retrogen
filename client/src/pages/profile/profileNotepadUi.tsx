import { useCallback, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import type { ProfileDesign } from "./profileDesign";
import {
  NOTEPAD_LINE_HEIGHT_PX,
  NOTEPAD_MAX_LENGTH,
  NOTEPAD_PLACEHOLDER,
  NOTEPAD_SNIPPETS,
  notepadLinedBackground,
  notepadStats,
  type NotepadSnippet,
} from "./profileNotepadPresets";

function insertAtCursor(textarea: HTMLTextAreaElement, snippet: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const needsGap = before.length > 0 && !before.endsWith("\n") && !before.endsWith("\n\n");
  const prefix = needsGap ? "\n\n" : "";
  const next = before + prefix + snippet + after;
  return { value: next.slice(0, NOTEPAD_MAX_LENGTH), cursor: start + prefix.length + snippet.length };
}

export function NotepadHero({ d }: { d: ProfileDesign }) {
  return (
    <div
      className={`relative overflow-hidden ${d.insetGroup} border-amber-500/20 bg-gradient-to-br from-amber-500/8 via-[var(--ph-surface)] to-[var(--ph-surface-elevated)] p-5 sm:p-6 dark:from-amber-950/30`}
    >
      <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-[0.6875rem] font-semibold uppercase tracking-wide ${d.muted}`}>Личное пространство</p>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide ${d.rFull} ${
                d.isLight ? "bg-amber-100 text-amber-900" : "bg-amber-500/15 text-amber-200"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Только вы
            </span>
          </div>
          <h2 className="mt-1 text-[1.125rem] font-semibold tracking-[-0.02em] text-[var(--ph-text)] sm:text-[1.25rem]">
            Блокнот фасилитатора
          </h2>
          <p className={`mt-2 text-[0.8125rem] leading-relaxed ${d.muted}`}>
            План сессии, ссылки и action items — видны только вам. Сохраняются в этом браузере вместе с профилем.
          </p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ring-1 ring-amber-500/25 ${
            d.isLight ? "bg-amber-50" : "bg-amber-950/40"
          }`}
          aria-hidden
        >
          📓
        </span>
      </div>
    </div>
  );
}

export function NotepadInsightStrip({
  d,
  text,
}: {
  d: ProfileDesign;
  text: string;
}) {
  const { chars, words, lines } = notepadStats(text);
  const pct = Math.min(100, Math.round((chars / NOTEPAD_MAX_LENGTH) * 100));
  const nearLimit = pct >= 85;

  const items = [
    { label: "Символов", value: chars.toLocaleString("ru-RU") },
    { label: "Слов", value: words.toLocaleString("ru-RU") },
    { label: "Строк", value: lines.toLocaleString("ru-RU") },
  ];

  return (
    <div className={`min-w-0 ${d.insetGroup} overflow-hidden`}>
      <div className="grid gap-2 p-2.5 sm:grid-cols-3 sm:p-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={`rounded-lg bg-[var(--ph-surface-elevated)] px-3 py-2.5 ring-1 ring-[var(--ph-border)] ${d.rSm}`}
          >
            <p className={`text-[0.6875rem] font-medium ${d.muted}`}>{item.label}</p>
            <p className="mt-0.5 text-[1.25rem] font-semibold tabular-nums tracking-[-0.02em] text-[var(--ph-text)]">
              {item.value}
            </p>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--ph-separator)] px-3 py-2.5 sm:px-4">
        <div className="flex items-center justify-between gap-2 text-[0.6875rem]">
          <span className={nearLimit ? "font-medium text-amber-600 dark:text-amber-400" : d.muted}>
            {nearLimit ? "Близко к лимиту" : "Автосохранение при изменении"}
          </span>
          <span className={`tabular-nums ${d.muted}`}>
            {chars.toLocaleString("ru-RU")} / {NOTEPAD_MAX_LENGTH.toLocaleString("ru-RU")}
          </span>
        </div>
        <div className={`mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--ph-surface-elevated)] ${d.rFull}`}>
          <div
            className={`h-full rounded-full transition-all ${
              nearLimit ? "bg-amber-500" : "bg-[var(--ph-accent)]"
            }`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={chars}
            aria-valuemin={0}
            aria-valuemax={NOTEPAD_MAX_LENGTH}
          />
        </div>
      </div>
    </div>
  );
}

export function NotepadSnippetBar({
  d,
  textareaRef,
  value,
  onChange,
  disabled,
}: {
  d: ProfileDesign;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const apply = useCallback(
    (snippet: NotepadSnippet) => {
      const el = textareaRef.current;
      if (!el || disabled) return;
      const { value: next, cursor } = insertAtCursor(el, snippet.text);
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    },
    [textareaRef, onChange, disabled],
  );

  return (
    <div className="space-y-2">
      <p className={`text-[0.6875rem] font-medium ${d.muted}`}>Вставить блок</p>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {NOTEPAD_SNIPPETS.map((snippet) => (
          <button
            key={snippet.id}
            type="button"
            disabled={disabled || value.length >= NOTEPAD_MAX_LENGTH}
            onClick={() => apply(snippet)}
            className={`flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-center transition disabled:opacity-40 ${d.rSm} bg-[var(--ph-surface)] text-[var(--ph-text)] ring-1 ring-[var(--ph-border)] hover:bg-[var(--ph-nav-hover)] hover:ring-[var(--ph-accent)]/30 sm:flex-row sm:gap-1.5 sm:px-2 sm:py-1.5`}
            title={snippet.label}
          >
            <span className="text-base leading-none sm:text-sm" aria-hidden>
              {snippet.icon}
            </span>
            <span className="w-full truncate text-[0.6875rem] font-medium sm:w-auto sm:text-[0.75rem]">{snippet.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NotepadWorkspace({
  d,
  value,
  onChange,
}: {
  d: ProfileDesign;
  value: string;
  onChange: (v: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const onClear = () => {
    if (!value.trim()) return;
    if (window.confirm("Очистить весь блокнот? Это действие нельзя отменить.")) {
      onChange("");
      textareaRef.current?.focus();
    }
  };

  const lineHeight = `${NOTEPAD_LINE_HEIGHT_PX}px`;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
        <div>
          <h2 className={d.groupTitle}>Заметки</h2>
          <p className={d.groupDesc}>Пишите свободно или вставляйте готовые блоки</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${d.btnGhost} !px-3`}
            disabled={!value.trim()}
            onClick={() => void onCopy()}
          >
            {copied ? "Скопировано" : "Копировать"}
          </button>
          <button
            type="button"
            className={`${d.btnGhost} !px-3 text-red-600 dark:text-red-400`}
            disabled={!value.trim()}
            onClick={onClear}
          >
            Очистить
          </button>
        </div>
      </div>

      <div className={`min-w-0 overflow-hidden ${d.insetGroup}`}>
        <div className="border-b border-[var(--ph-separator)] bg-[var(--ph-surface-elevated)] px-3 py-2.5 sm:px-4">
          <NotepadSnippetBar d={d} textareaRef={textareaRef} value={value} onChange={onChange} />
        </div>

        <div className="bg-[var(--ph-notepad-bg)]">
          <textarea
            ref={textareaRef}
            className="block min-h-[min(22rem,55vh)] w-full resize-y border-0 bg-transparent px-4 pb-4 pt-1 font-[inherit] text-[0.9375rem] text-[var(--ph-text)] outline-none placeholder:text-[var(--ph-muted)] placeholder:opacity-80"
            style={{
              lineHeight,
              backgroundImage: notepadLinedBackground(),
              backgroundAttachment: "local",
              backgroundSize: `100% ${lineHeight}`,
              /* линии на 2px ниже — descenders ([ ]) не наезжают на разметку */
              backgroundPosition: "0 2px",
            }}
            value={value}
            placeholder={NOTEPAD_PLACEHOLDER}
            maxLength={NOTEPAD_MAX_LENGTH}
            spellCheck
            onChange={(e) => onChange(e.target.value)}
            aria-label="Текст блокнота"
            aria-describedby="profile-notepad-meta"
          />
        </div>

        <div
          id="profile-notepad-meta"
          className={`flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ph-separator)] bg-[var(--ph-notepad-bg)] px-4 py-2.5 text-[0.6875rem] ${d.muted} sm:px-5`}
        >
          <span>Markdown не нужен — обычный текст и списки</span>
          <span className="tabular-nums">Лимит {NOTEPAD_MAX_LENGTH.toLocaleString("ru-RU")} символов</span>
        </div>
      </div>
    </section>
  );
}

export function NotepadResources({ d }: { d: ProfileDesign }) {
  return (
    <div className={`grid gap-2 sm:grid-cols-2 ${d.insetGroup} p-2.5 sm:p-3`}>
      <Link
        to="/workshop"
        className={`flex min-w-0 flex-col gap-1 ${d.rSm} bg-[var(--ph-surface-elevated)] p-3 ring-1 ring-[var(--ph-border)] transition hover:bg-[var(--ph-nav-hover)] hover:ring-[var(--ph-accent)]/30`}
      >
        <span className="text-lg" aria-hidden>
          🧩
        </span>
        <span className="text-[0.8125rem] font-semibold text-[var(--ph-text)]">Мастерская шаблонов</span>
        <span className={`text-[0.75rem] leading-relaxed ${d.muted}`}>Готовые сценарии досок для ретро</span>
      </Link>
      <Link
        to="/home"
        className={`flex min-w-0 flex-col gap-1 ${d.rSm} bg-[var(--ph-surface-elevated)] p-3 ring-1 ring-[var(--ph-border)] transition hover:bg-[var(--ph-nav-hover)] hover:ring-[var(--ph-accent)]/30`}
      >
        <span className="text-lg" aria-hidden>
          🏠
        </span>
        <span className="text-[0.8125rem] font-semibold text-[var(--ph-text)]">Лобби комнат</span>
        <span className={`text-[0.75rem] leading-relaxed ${d.muted}`}>Создать или открыть сессию</span>
      </Link>
    </div>
  );
}
