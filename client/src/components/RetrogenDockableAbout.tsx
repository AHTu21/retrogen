import { useCallback, useEffect, useRef, useState } from "react";
import { ChangelogView } from "./ChangelogView";
/** Текст журнала подставляется на этапе сборки / dev из корня репозитория (`CHANGELOG.md?raw`). Правки файла → пересборка или HMR в Vite. */
import changelogRaw from "../../../CHANGELOG.md?raw";
import clientPackage from "../../package.json";

type DragState = { startX: number; startY: number; startLeft: number; startTop: number } | null;

type Props = {
  open: boolean;
  onClose: () => void;
  isLight: boolean;
};

export function RetrogenDockableAbout({ open, onClose, isLight }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [pos, setPos] = useState({ x: 32, y: 96 });
  const dragRef = useRef<DragState>(null);

  useEffect(() => {
    if (!open) {
      setExpanded(false);
      return;
    }
    setExpanded(false);
    setPos((p) => ({ x: p.x, y: Math.min(p.y, 120) }));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (expanded) {
        setExpanded(false);
        e.preventDefault();
        return;
      }
      onClose();
      e.preventDefault();
    };
    window.addEventListener("keydown", onEsc, true);
    return () => window.removeEventListener("keydown", onEsc, true);
  }, [open, expanded, onClose]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      setPos({ x: Math.max(8, drag.startLeft + dx), y: Math.max(8, drag.startTop + dy) });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const beginDrag = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button,a,input,textarea,select")) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: pos.x,
      startTop: pos.y,
    };
  }, [pos.x, pos.y]);

  if (!open) return null;

  const shell = `flex w-[min(720px,calc(100vw-32px))] max-h-[min(82vh,calc(100vh-48px))] flex-col overflow-hidden rounded-xl border shadow-2xl ${
    isLight ? "border-zinc-300 bg-white/95 text-zinc-800" : "border-zinc-700 bg-zinc-900/95 text-zinc-100"
  }`;

  const body = (
    <>
      <p className="mb-4 text-sm leading-relaxed opacity-90">
        Журнал изменений по версиям — от новых к старым. Окно можно перетаскивать за заголовок, развернуть на весь экран или закрыть кнопкой «−» /
        Esc.
      </p>
      <ChangelogView source={changelogRaw} />
    </>
  );

  return (
    <>
      {!expanded && (
        <div
          data-about-dock="true"
          className={`fixed z-[1002] ${shell}`}
          style={{ left: pos.x, top: pos.y }}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className={`flex shrink-0 cursor-move select-none items-center justify-between rounded-t-xl border-b px-3 py-2 text-sm ${
              isLight ? "border-zinc-200 bg-zinc-100 text-zinc-700" : "border-zinc-600 bg-zinc-800 text-zinc-200"
            }`}
            onMouseDown={beginDrag}
          >
            <div className="min-w-0 pr-2">
              <span className="font-semibold">О программе Retrogen</span>
              <p className="mt-0.5 text-xs opacity-80">
                Клиент <span className="font-mono">{clientPackage.version}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className={`flex h-7 w-7 items-center justify-center rounded ${
                  isLight ? "bg-white text-zinc-700 hover:bg-zinc-200" : "bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
                }`}
                onClick={() => setExpanded(true)}
                title="На весь экран"
                aria-label="Развернуть на весь экран"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>
              <button
                type="button"
                className={`flex h-7 w-7 items-center justify-center rounded ${
                  isLight ? "bg-white text-zinc-700 hover:bg-zinc-200" : "bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
                }`}
                onClick={() => {
                  setExpanded(false);
                  onClose();
                }}
                title="Свернуть"
                aria-label="Закрыть окно о программе"
              >
                <span className="text-base leading-none">−</span>
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">{body}</div>
        </div>
      )}
      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="retrogen-about-dock-title"
          data-about-dock="true"
          className={`fixed inset-0 z-[1003] flex min-h-0 flex-col ${isLight ? "bg-white text-zinc-800" : "bg-zinc-900 text-zinc-100"}`}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className={`flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 sm:px-6 ${
              isLight ? "border-zinc-200 bg-zinc-50" : "border-zinc-600 bg-zinc-800/90"
            }`}
          >
            <div className="min-w-0">
              <h2 id="retrogen-about-dock-title" className="text-lg font-semibold leading-tight">
                О программе Retrogen
              </h2>
              <p className="mt-1 text-xs opacity-80">
                Версия клиента <span className="font-mono">{clientPackage.version}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  isLight ? "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100" : "border border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                }`}
                onClick={() => setExpanded(false)}
                title="Вернуться к окну"
                aria-label="Свернуть на плавающее окно"
              >
                Окно
              </button>
              <button
                type="button"
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  isLight ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-200 text-zinc-900 hover:bg-white"
                }`}
                onClick={() => {
                  setExpanded(false);
                  onClose();
                }}
                title="Закрыть"
                aria-label="Закрыть о программе"
              >
                Закрыть
              </button>
            </div>
          </div>
          <div className="mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">{body}</div>
        </div>
      )}
    </>
  );
}
