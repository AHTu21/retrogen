import type { MouseEvent } from "react";
import type { BoardGadgetDto } from "../../types";
import { formatGadgetCountdown, gadgetSize, pollVoteCounts } from "../../lib/planeGadgets";

type Props = {
  gadgets: BoardGadgetDto[];
  selectedGadgetId: string | null;
  boardFrozen: boolean;
  boardNowTs: number;
  isLight: boolean;
  voterKey: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDragStart: (event: MouseEvent, gadget: BoardGadgetDto) => void;
  onResizeStart: (event: MouseEvent, gadget: BoardGadgetDto) => void;
  onRandomPick: (id: string) => void;
  onPollVote: (id: string, optionIndex: number) => void;
};

export function PlaneGadgetLayer({
  gadgets,
  selectedGadgetId,
  boardFrozen,
  boardNowTs,
  isLight,
  voterKey,
  onSelect,
  onRemove,
  onDragStart,
  onResizeStart,
  onRandomPick,
  onPollVote,
}: Props) {
  return (
    <>
      {gadgets.map((g) => {
        const sel = selectedGadgetId === g.id;
        const { width, height } = gadgetSize(g);
        const shell = `absolute cursor-grab select-none rounded-lg border shadow-lg overflow-hidden ${
          sel ? "border-sky-500 ring-2 ring-sky-400/50" : isLight ? "border-zinc-300 bg-white/95" : "border-zinc-600 bg-zinc-900/95"
        }`;

        const chrome = sel && !boardFrozen && (
          <>
            <button
              type="button"
              className="absolute -right-2 -top-2 z-10 rounded bg-rose-600 px-1 text-[11px] text-white"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(g.id);
              }}
              title="Удалить"
            >
              ✕
            </button>
            <span
              className="absolute -bottom-1 -right-1 z-10 h-3 w-3 cursor-se-resize rounded-sm bg-sky-500"
              onMouseDown={(e) => onResizeStart(e, g)}
              title="Изменить размер"
            />
          </>
        );

        if (g.kind === "timer") {
          const done = boardNowTs >= g.endsAtMs;
          return (
            <div
              key={g.id}
              data-plane-gadget="true"
              className={`${shell} px-2 py-1.5 text-sm`}
              style={{ left: g.x, top: g.y, width, height, zIndex: g.layerZ ?? 340 }}
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
              {chrome}
            </div>
          );
        }

        if (g.kind === "randomPick") {
          return (
            <div
              key={g.id}
              data-plane-gadget="true"
              className={`${shell} px-2 py-1.5 text-sm`}
              style={{ left: g.x, top: g.y, width, height, zIndex: g.layerZ ?? 340 }}
              onMouseDown={(e) => onDragStart(e, g)}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(g.id);
              }}
            >
              <div className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
                Случайный
              </div>
              <div className={`mt-0.5 truncate text-base font-medium ${isLight ? "text-zinc-900" : "text-white"}`}>
                {g.pickedName ?? "—"}
              </div>
              {sel && !boardFrozen ? (
                <>
                  {chrome}
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

        if (g.kind === "poll") {
          const counts = pollVoteCounts(g);
          const myVote = g.votes?.[voterKey];
          return (
            <div
              key={g.id}
              data-plane-gadget="true"
              className={`${shell} p-2 text-sm`}
              style={{ left: g.x, top: g.y, width, height, zIndex: g.layerZ ?? 340 }}
              onMouseDown={(e) => onDragStart(e, g)}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(g.id);
              }}
            >
              <div className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
                Опрос
              </div>
              <div className={`mb-2 text-xs font-medium leading-snug ${isLight ? "text-zinc-900" : "text-white"}`}>{g.question}</div>
              <div className="flex flex-col gap-1">
                {g.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={boardFrozen}
                    className={`rounded border px-2 py-1 text-left text-[11px] ${
                      myVote === i
                        ? "border-sky-500 bg-sky-500/20"
                        : isLight
                          ? "border-zinc-200 hover:bg-zinc-50"
                          : "border-zinc-600 hover:bg-zinc-800"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPollVote(g.id, i);
                    }}
                  >
                    {opt}
                    {counts[i]! > 0 ? <span className="ml-1 opacity-60">({counts[i]})</span> : null}
                  </button>
                ))}
              </div>
              {chrome}
            </div>
          );
        }

        if (g.kind === "embed") {
          return (
            <div
              key={g.id}
              data-plane-gadget="true"
              className={shell}
              style={{ left: g.x, top: g.y, width, height, zIndex: g.layerZ ?? 340 }}
              onMouseDown={(e) => onDragStart(e, g)}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(g.id);
              }}
            >
              <iframe
                src={g.url}
                title={g.title ?? "Embed"}
                className="h-full w-full border-0 bg-black/20"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                referrerPolicy="no-referrer"
              />
              {chrome}
            </div>
          );
        }

        return null;
      })}
    </>
  );
}
