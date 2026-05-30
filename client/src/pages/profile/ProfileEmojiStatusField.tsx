import { useEffect, useRef, useState } from "react";
import { PROFILE_STATUS_EMOJI } from "../../lib/profileStatusEmoji";
import type { ProfileDesign } from "./profileDesign";

type Props = {
  d: ProfileDesign;
  value: string;
  onChange: (emoji: string) => void;
};

/** Выбор эмодзи-статуса — тот же набор, что в мессенджере. */
export function ProfileEmojiStatusField({ d, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-11 w-full items-center gap-3 px-3 text-left ring-1 ring-[var(--ph-input-border)] transition hover:bg-[var(--ph-nav-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ph-accent)]/40 ${d.rSm} bg-[var(--ph-input-bg)]`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ph-surface-elevated)] text-lg ring-1 ring-[var(--ph-border)]">
          {value ? (
            value
          ) : (
            <span className={`text-[0.6875rem] font-medium ${d.muted}`} aria-hidden>
              —
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1 text-[0.8125rem] text-[var(--ph-text)]">
          {value ? `Статус: ${value}` : "Без статуса — выберите эмодзи"}
        </span>
        <span className={`text-[0.75rem] ${d.muted}`} aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label="Эмодзи-статус"
          className={`absolute z-30 mt-1.5 max-h-52 w-full overflow-y-auto p-2 ring-1 ring-[var(--ph-border)] ${d.rSm} bg-[var(--ph-panel-bg)] shadow-lg`}
        >
          <div className="grid grid-cols-6 gap-1">
            {PROFILE_STATUS_EMOJI.map((emoji) => {
              const active = value === emoji;
              return (
                <button
                  key={emoji || "clear"}
                  type="button"
                  role="option"
                  aria-selected={active}
                  title={emoji ? `Статус ${emoji}` : "Без статуса"}
                  className={`flex h-9 items-center justify-center rounded-lg text-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ph-accent)]/40 ${
                    active
                      ? "bg-[var(--ph-nav-active-bg)] ring-1 ring-[var(--ph-accent)]"
                      : "hover:bg-[var(--ph-nav-hover)]"
                  }`}
                  onClick={() => {
                    onChange(emoji);
                    setOpen(false);
                  }}
                >
                  {emoji || <span className="text-xs opacity-40">—</span>}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
