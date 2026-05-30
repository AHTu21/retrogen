import { lazy, Suspense, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { NOTEPAD_MAX_PLAIN_CHARS, notepadStatsFromContent } from "../../lib/profileNotepadContent";
import type { ProfileDesign } from "./profileDesign";
import { ProfileNotepadErrorBoundary } from "./ProfileNotepadErrorBoundary";

const ProfileNotepadEditor = lazy(() =>
  import("./ProfileNotepadEditor").then((m) => ({ default: m.ProfileNotepadEditor })),
);

export function NotepadCompactStats({
  d,
  text,
}: {
  d: ProfileDesign;
  text: string;
}) {
  const { chars, words, lines } = notepadStatsFromContent(text);
  const pct = Math.min(100, Math.round((chars / NOTEPAD_MAX_PLAIN_CHARS) * 100));
  const nearLimit = pct >= 85;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.6875rem] ${d.muted}`}
      aria-live="polite"
    >
      <span className="tabular-nums">
        {words.toLocaleString("ru-RU")} сл. · {lines.toLocaleString("ru-RU")} стр.
      </span>
      <span className={`tabular-nums ${nearLimit ? "font-medium text-amber-600 dark:text-amber-400" : ""}`}>
        {chars.toLocaleString("ru-RU")} / {NOTEPAD_MAX_PLAIN_CHARS.toLocaleString("ru-RU")}
      </span>
      <span className="hidden sm:inline">Автосохранение</span>
    </div>
  );
}

export function NotepadWorkspace({
  d,
  value,
  onChange,
  themeStyle,
}: {
  d: ProfileDesign;
  value: string;
  onChange: (v: string) => void;
  themeStyle: CSSProperties;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <ProfileNotepadErrorBoundary d={d} value={value} onChange={onChange}>
        <Suspense
          fallback={
            <div
              className={`flex min-h-[min(20rem,50vh)] items-center justify-center ${d.insetGroup} bg-[var(--ph-notepad-bg)] text-[0.8125rem] ${d.muted}`}
            >
              Загрузка редактора…
            </div>
          }
        >
          <ProfileNotepadEditor d={d} value={value} onChange={onChange} themeStyle={themeStyle} />
        </Suspense>
      </ProfileNotepadErrorBoundary>
    </section>
  );
}

export function NotepadQuickLinks({ d }: { d: ProfileDesign }) {
  return (
    <div className={`flex flex-wrap gap-2 ${d.insetGroup} p-2`}>
      <Link
        to="/workshop"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[0.75rem] font-medium ${d.rSm} bg-[var(--ph-surface-elevated)] ring-1 ring-[var(--ph-border)] transition hover:bg-[var(--ph-nav-hover)]`}
      >
        <span aria-hidden>🧩</span>
        Мастерская
      </Link>
      <Link
        to="/home"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[0.75rem] font-medium ${d.rSm} bg-[var(--ph-surface-elevated)] ring-1 ring-[var(--ph-border)] transition hover:bg-[var(--ph-nav-hover)]`}
      >
        <span aria-hidden>🏠</span>
        Лобби
      </Link>
    </div>
  );
}
