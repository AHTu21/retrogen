import { useRef, type ReactNode } from "react";
import type { ProfileDesign } from "../pages/profile/profileDesign";
import { MIN_HEIGHT, MIN_WIDTH, VIEWPORT_MARGIN } from "./settingsHubLayout";
import { useSettingsHub } from "./SettingsHubProvider";
import { SettingsHubSavePill } from "./settingsHubUi";
import { SETTINGS_HUB_Z_DIALOG, SETTINGS_HUB_Z_OVERLAY } from "./settingsHubZIndex";

type DragState = {
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  width: number;
  height: number;
} | null;

type ResizeState = {
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  anchorX: number;
  anchorY: number;
} | null;

type Props = {
  d: ProfileDesign;
  accentStyle: React.CSSProperties;
  title: string;
  nav: ReactNode;
  children: ReactNode;
  toolbar: ReactNode;
  saveStatus: { kind: string; text: string } | null;
};

const chromeBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ph-surface-elevated)] text-[var(--ph-text)] ring-1 ring-[var(--ph-border)] transition hover:bg-[var(--ph-nav-hover)] active:scale-[0.98]";

export function SettingsHubWindow({ d, accentStyle, title, nav, children, toolbar, saveStatus }: Props) {
  const { layout, close, setFullscreen, updateLayout } = useSettingsHub();
  const dragRef = useRef<DragState>(null);
  const resizeRef = useRef<ResizeState>(null);

  const isFullscreen = layout.mode === "fullscreen";

  function beginDrag(event: React.MouseEvent) {
    if (isFullscreen || event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button,a,input,textarea,select,[data-no-drag]")) return;
    event.preventDefault();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: layout.x,
      startTop: layout.y,
      width: layout.width,
      height: layout.height,
    };

    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const maxX = window.innerWidth - drag.width - VIEWPORT_MARGIN;
      const maxY = window.innerHeight - drag.height - VIEWPORT_MARGIN;
      updateLayout({
        x: Math.min(Math.max(VIEWPORT_MARGIN, drag.startLeft + e.clientX - drag.startX), Math.max(VIEWPORT_MARGIN, maxX)),
        y: Math.min(Math.max(VIEWPORT_MARGIN, drag.startTop + e.clientY - drag.startY), Math.max(VIEWPORT_MARGIN, maxY)),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function beginResize(event: React.MouseEvent) {
    if (isFullscreen || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startW: layout.width,
      startH: layout.height,
      anchorX: layout.x,
      anchorY: layout.y,
    };

    const onMove = (e: MouseEvent) => {
      const resize = resizeRef.current;
      if (!resize) return;
      const maxW = window.innerWidth - resize.anchorX - VIEWPORT_MARGIN;
      const maxH = window.innerHeight - resize.anchorY - VIEWPORT_MARGIN;
      updateLayout({
        width: Math.min(Math.max(resize.startW + e.clientX - resize.startX, MIN_WIDTH), maxW),
        height: Math.min(Math.max(resize.startH + e.clientY - resize.startY, MIN_HEIGHT), maxH),
      });
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const shellClass = isFullscreen
    ? "fixed inset-0 flex min-h-0 flex-col"
    : "fixed flex min-h-0 flex-col overflow-hidden rounded-2xl ring-1 ring-[var(--ph-border)] shadow-2xl";

  const shellStyle: React.CSSProperties = isFullscreen
    ? { zIndex: SETTINGS_HUB_Z_DIALOG }
    : { zIndex: SETTINGS_HUB_Z_DIALOG, left: layout.x, top: layout.y, width: layout.width, height: layout.height };

  const shellTheme =
    "border-zinc-200/80 bg-white text-zinc-900 dark:border-zinc-700/80 dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <div
      className="fixed inset-0 antialiased"
      style={{ zIndex: SETTINGS_HUB_Z_OVERLAY }}
      aria-hidden={false}
    >
      {!isFullscreen ? (
        <button
          type="button"
          className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          aria-label="Закрыть настройки"
          onClick={close}
        />
      ) : null}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-hub-title"
        data-settings-hub="true"
        className={`profile-app pointer-events-auto ${shellClass} ${shellTheme} bg-[var(--ph-panel-bg)] text-[var(--ph-text)]`}
        style={{ ...accentStyle, ...shellStyle }}
        onMouseDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <header
          className={`flex shrink-0 items-center gap-3 border-b border-[var(--ph-border)] bg-[var(--ph-sticky-bg)] px-4 py-2.5 backdrop-blur-xl sm:px-5 ${
            isFullscreen ? "" : "cursor-move select-none"
          }`}
          onMouseDown={beginDrag}
        >
          <div className="min-w-0 flex-1">
            <p className={`${d.eyebrow} hidden sm:block`}>Retrogen</p>
            <h1 id="settings-hub-title" className="truncate text-[0.9375rem] font-semibold tracking-[-0.01em] sm:text-base">
              {title}
            </h1>
          </div>
          <SettingsHubSavePill d={d} saveStatus={saveStatus} />
          <div className="flex shrink-0 items-center gap-1.5" data-no-drag="true">
            {toolbar}
            <button
              type="button"
              className={chromeBtn}
              onClick={() => setFullscreen(!isFullscreen)}
              title={isFullscreen ? "Окно" : "На весь экран"}
              aria-label={isFullscreen ? "Свернуть в окно" : "Развернуть на весь экран"}
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M9 4H4v5M15 20h5v-5M20 4h-5M4 20v-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
            <button type="button" className={chromeBtn} onClick={close} title="Закрыть" aria-label="Закрыть настройки">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="settings-hub-scroll w-[12.75rem] shrink-0 border-r border-[var(--ph-separator)] bg-[var(--ph-sidebar-bg)]">
            {nav}
          </aside>
          <div className="settings-hub-scroll min-h-0 min-w-0 flex-1 overflow-y-auto bg-[var(--ph-panel-bg)]">{children}</div>
        </div>

        {!isFullscreen ? (
          <div
            aria-hidden="true"
            className="absolute bottom-0 right-0 z-10 flex h-6 w-6 cursor-se-resize items-end justify-end p-0.5"
            onMouseDown={beginResize}
            title="Изменить размер"
          >
            <svg viewBox="0 0 12 12" className="h-3.5 w-3.5 text-[var(--ph-muted)] opacity-50" aria-hidden>
              <path d="M12 12H8V8h4v4zm-4 0H4V8h4v4zM4 4H0V0h4v4z" fill="currentColor" />
            </svg>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SettingsHubSizeToolbar({ d }: { d: ProfileDesign }) {
  const { layout, applyPreset } = useSettingsHub();
  const btn = (preset: "sm" | "md" | "lg", label: string) => {
    const active = layout.preset === preset && layout.mode === "window";
    return (
      <button
        key={preset}
        type="button"
        data-no-drag="true"
        className={`min-w-[1.75rem] rounded-md px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide transition ${
          active
            ? "bg-[var(--ph-nav-active-bg)] text-[var(--ph-nav-active-text)]"
            : "text-[var(--ph-muted)] hover:bg-[var(--ph-nav-hover)] hover:text-[var(--ph-text)]"
        }`}
        onClick={() => applyPreset(preset)}
        title={`Размер ${label}`}
      >
        {label}
      </button>
    );
  };
  return (
    <div
      className={`hidden items-center gap-0.5 ${d.rSm} bg-[var(--ph-surface-elevated)] p-0.5 ring-1 ring-[var(--ph-border)] sm:flex`}
      data-no-drag="true"
      role="group"
      aria-label="Размер окна"
    >
      {btn("sm", "S")}
      {btn("md", "M")}
      {btn("lg", "L")}
    </div>
  );
}
