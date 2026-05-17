import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type HelpDragState = { startX: number; startY: number; startLeft: number; startTop: number } | null;

type Ctx = {
  helpMinimized: boolean;
  helpExpanded: boolean;
  setHelpMinimized: (v: boolean) => void;
  setHelpExpanded: (v: boolean) => void;
  setAboutClosed: () => void;
  toggleFromHeader: () => void;
};

const DockCtx = createContext<Ctx | null>(null);

function useDockCtx() {
  const c = useContext(DockCtx);
  if (!c) throw new Error("RetrogenDockableHelp.Toggle must be inside Root");
  return c;
}

type RootProps = {
  isLight: boolean;
  title: string;
  /** Закрыть «О программе» при открытии справки (как в комнате) */
  onHelpOpenCloseAbout?: () => void;
  children: ReactNode;
  /** Содержимое окна / полного экрана */
  body: ReactNode;
};

export function RetrogenDockableHelpRoot({ isLight, title, onHelpOpenCloseAbout, children, body }: RootProps) {
  const [helpMinimized, setHelpMinimized] = useState(true);
  const [helpExpanded, setHelpExpanded] = useState(false);
  const [helpPos, setHelpPos] = useState({ x: 16, y: 72 });
  const helpDragRef = useRef<HelpDragState>(null);

  const setAboutClosed = useCallback(() => {
    onHelpOpenCloseAbout?.();
  }, [onHelpOpenCloseAbout]);

  const toggleFromHeader = useCallback(() => {
    setAboutClosed();
    if (helpMinimized) {
      setHelpExpanded(false);
      setHelpMinimized(false);
    } else {
      setHelpMinimized(true);
    }
  }, [helpMinimized, setAboutClosed]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const drag = helpDragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      setHelpPos({ x: Math.max(8, drag.startLeft + dx), y: Math.max(8, drag.startTop + dy) });
    };
    const onMouseUp = () => {
      helpDragRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function beginHelpDrag(event: React.MouseEvent) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button,a,input,textarea,select")) return;
    event.preventDefault();
    event.stopPropagation();
    helpDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: helpPos.x,
      startTop: helpPos.y,
    };
  }

  const ctx = useMemo(
    () =>
      ({
        helpMinimized,
        helpExpanded,
        setHelpMinimized,
        setHelpExpanded,
        setAboutClosed,
        toggleFromHeader,
      }) satisfies Ctx,
    [helpMinimized, helpExpanded, setAboutClosed, toggleFromHeader],
  );

  return (
    <DockCtx.Provider value={ctx}>
      {children}
      {!helpMinimized && !helpExpanded && (
        <div
          data-help-overlay="true"
          className={`fixed z-[998] flex w-[min(460px,calc(100vw-40px))] max-h-[min(520px,calc(100vh-120px))] flex-col overflow-hidden rounded-xl border shadow-xl ${
            isLight ? "border-zinc-300 bg-white/95 text-zinc-800" : "border-zinc-700 bg-zinc-900/95 text-zinc-100"
          }`}
          style={{ left: helpPos.x, top: helpPos.y }}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className={`flex cursor-move select-none items-center justify-between rounded-t-xl px-3 py-2 text-sm ${
              isLight ? "bg-zinc-100 text-zinc-700" : "bg-zinc-800 text-zinc-200"
            }`}
            onMouseDown={beginHelpDrag}
          >
            <span className="font-semibold">{title}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={`flex h-7 w-7 items-center justify-center rounded ${
                  isLight ? "bg-white text-zinc-700 hover:bg-zinc-200" : "bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
                }`}
                onClick={() => setHelpExpanded(true)}
                title="На весь экран"
                aria-label="Развернуть справку на весь экран"
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
                  setHelpExpanded(false);
                  setHelpMinimized(true);
                }}
                title="Свернуть в кнопку"
                aria-label="Закрыть справку"
              >
                <span className="text-base leading-none">−</span>
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm leading-snug">{body}</div>
        </div>
      )}
      {!helpMinimized && helpExpanded && (
        <div
          role="dialog"
          aria-modal="true"
          data-help-overlay="true"
          className={`fixed inset-0 z-[1000] flex min-h-0 flex-col ${isLight ? "bg-white text-zinc-800" : "bg-zinc-900 text-zinc-100"}`}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className={`flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 sm:px-6 ${
              isLight ? "border-zinc-200 bg-zinc-50" : "border-zinc-600 bg-zinc-800/90"
            }`}
          >
            <span className="text-lg font-semibold">{title}</span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  isLight ? "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100" : "border border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                }`}
                onClick={() => setHelpExpanded(false)}
                title="Вернуться к маленькому окну"
                aria-label="Свернуть на маленькое окно"
              >
                Окно
              </button>
              <button
                type="button"
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  isLight ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-200 text-zinc-900 hover:bg-white"
                }`}
                onClick={() => {
                  setHelpExpanded(false);
                  setHelpMinimized(true);
                }}
                title="Свернуть в кнопку в шапке"
                aria-label="Закрыть справку"
              >
                Закрыть
              </button>
            </div>
          </div>
          <div className="mx-auto min-h-0 w-full max-w-3xl flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm leading-snug sm:px-8 sm:py-6">
            {body}
          </div>
        </div>
      )}
    </DockCtx.Provider>
  );
}

export function RetrogenDockableHelpToggle({ isLight }: { isLight: boolean }) {
  const { helpMinimized, toggleFromHeader } = useDockCtx();
  return (
    <button
      type="button"
      className={`rounded p-2 text-sm ${isLight ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-900"}`}
      onClick={toggleFromHeader}
      title={helpMinimized ? "Открыть справку" : "Скрыть справку"}
      aria-label={helpMinimized ? "Открыть справку" : "Скрыть справку"}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 1 1 3.7 2.2c-.8.45-1.2.95-1.2 1.8v.5" />
        <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}
