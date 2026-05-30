import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PROFILE_STATUS_EMOJI } from "../../lib/profileStatusEmoji";
import type { ProfileDesign } from "./profileDesign";

type Props = {
  d: ProfileDesign;
  value: string;
  onChange: (emoji: string) => void;
};

/** Выбор эмодзи-статуса — тот же набор, что в мессенджере. Popover в portal (карточка с overflow-hidden). */
export function ProfileEmojiStatusField({ d, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
  }>({ left: 0, width: 280 });

  const updateAnchor = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const width = Math.max(240, r.width);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    const spaceBelow = window.innerHeight - r.bottom - 12;
    const openUp = spaceBelow < 200 && r.top > spaceBelow;
    setAnchor(
      openUp
        ? { left, width, bottom: window.innerHeight - r.top + 6 }
        : { left, width, top: r.bottom + 6 },
    );
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateAnchor();
    const onLayout = () => updateAnchor();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
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

  const popover =
    open && typeof document !== "undefined" ? (
      <div
        ref={popoverRef}
        role="listbox"
        aria-label="Эмодзи-статус"
        className={`fixed z-[500] max-h-[min(50vh,13rem)] overflow-y-auto p-2 ring-1 ring-[var(--ph-border)] ${d.rSm} bg-[var(--ph-panel-bg)] shadow-lg`}
        style={{
          top: anchor.top,
          bottom: anchor.bottom,
          left: anchor.left,
          width: anchor.width,
        }}
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
    ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          setOpen((o) => {
            if (!o) queueMicrotask(updateAnchor);
            return !o;
          });
        }}
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
      {popover ? createPortal(popover, document.body) : null}
    </>
  );
};
