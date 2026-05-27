import type { MouseEvent } from "react";
import type { BoardGadgetDto } from "../../types";
import { formatGadgetCountdown } from "../../lib/planeGadgets";

type Props = {
  gadgets: BoardGadgetDto[];
  selectedGadgetId: string | null;
  boardFrozen: boolean;
  boardNowTs: number;
  isLight: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDragStart: (event: MouseEvent, gadget: BoardGadgetDto) => void;
  onRandomPick: (id: string) => void;
};

export function PlaneGadgetLayer({
  gadgets,
  selectedGadgetId,
  boardFrozen,
  boardNowTs,
  isLight,
  onSelect,
  onRemove,
  onDragStart,
  onRandomPick,
}: Props) {
  return (
    <>
      {gadgets.map((g) => {
        const sel = selectedGadgetId === g.id;
        const shell = `absolute cursor-grab select-none rounded-lg border px-2 py-1.5 text-sm shadow-lg ${
          sel ? "border-sky-500 ring-2 ring-sky-400/50" : isLight ? "border-zinc-300 bg-white/95" : "border-zinc-600 bg-zinc-900/95"
        }`;

        if (g.kind === "timer") {
          const done = boardNowTs >= g.endsAtMs;
          return (
            <div
              key={g.id}
              data-plane-gadget="true"
              className={shell}
              style={{ left: g.x, top: g.y, zIndex: g.layerZ ?? 340 }}
              onMouseDown={(e) => onDragStart(e, g)}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(g.id);
              }}
            >
              <div className={`text-[10px] font-semibold uppercase tracking-wide ${done ? "text-rose-500" : isLight ? "text-zinc-500" : "text-zinc-400"}`}>
                Таймер
              </div>
              <div className={`font-mono text-lg tabular-nums ${done ? "text-rose-600" : isLight ? "text-zinc-900" : "text-white"}`}>
                {formatGadgetCountdown(g.endsAtMs, boardNowTs)}
              </div>
              {sel && !boardFrozen ? (
                <button
                  type="button"
                  className="absolute -right-2 -top-2 rounded bg-rose-600 px-1 text-[11px] text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(g.id);
                  }}
                  title="Удалить таймер"
                >
                  ✕
                </button>
              ) : null}
            </div>
          );
        }

        if (g.kind === "randomPick") {
          return (
            <div
              key={g.id}
              data-plane-gadget="true"
              className={shell}
              style={{ left: g.x, top: g.y, zIndex: g.layerZ ?? 340, minWidth: 120 }}
              onMouseDown={(e) => onDragStart(e, g)}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(g.id);
              }}
            >
              <div className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
                Случайный
              </div>
              <div className={`mt-0.5 max-w-[200px] truncate text-base font-medium ${isLight ? "text-zinc-900" : "text-white"}`}>
                {g.pickedName ?? "—"}
              </div>
              {sel && !boardFrozen ? (
                <>
                  <button
                    type="button"
                    className="absolute -right-2 -top-2 rounded bg-rose-600 px-1 text-[11px] text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(g.id);
                    }}
                    title="Удалить"
                  >
                    ✕
                  </button>
                  <button
                    type="button"
                    className="absolute -right-2 -bottom-2 flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-sm text-white shadow"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRandomPick(g.id);
                    }}
                    title="Выбрать случайного участника"
                  >
                    🎲
                  </button>
                </>
              ) : null}
            </div>
          );
        }

        return null;
      })}
    </>
  );
}
