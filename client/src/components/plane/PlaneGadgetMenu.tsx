import { useEffect, useRef, useState } from "react";

type Props = {
  isLight: boolean;
  boardFrozen: boolean;
  onAddTimer: () => void;
  onAddRandomPick: () => void;
  onAddPoll: () => void;
  onAddEmbed: () => void;
};

const ITEMS = [
  { key: "timer", label: "Таймер", icon: "⏱" },
  { key: "randomPick", label: "Случайный участник", icon: "🎲" },
  { key: "poll", label: "Опрос", icon: "📊" },
  { key: "embed", label: "Embed (iframe)", icon: "🔗" },
] as const;

export function PlaneGadgetMenu({ isLight, boardFrozen, onAddTimer, onAddRandomPick, onAddPoll, onAddEmbed }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(key: (typeof ITEMS)[number]["key"]) {
    setOpen(false);
    if (boardFrozen) return;
    if (key === "timer") onAddTimer();
    else if (key === "randomPick") onAddRandomPick();
    else if (key === "poll") onAddPoll();
    else onAddEmbed();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-toolbar-action="true"
        className={`flex h-11 w-11 items-center justify-center rounded text-lg ${
          open
            ? isLight
              ? "bg-sky-200 ring-2 ring-sky-500"
              : "bg-sky-900/70 ring-2 ring-sky-400"
            : isLight
              ? "bg-zinc-100 hover:bg-zinc-200"
              : "bg-zinc-800 hover:bg-zinc-700"
        }`}
        onClick={() => setOpen((o) => !o)}
        title="Добавить гаджет на плоскость"
        aria-label="Добавить гаджет"
        aria-expanded={open}
        disabled={boardFrozen}
      >
        ⊕
      </button>
      {open ? (
        <div
          className={`absolute left-12 top-0 z-[10050] min-w-[200px] rounded-lg border py-1 shadow-xl ${
            isLight ? "border-zinc-200 bg-white text-zinc-900" : "border-zinc-600 bg-zinc-900 text-white"
          }`}
        >
          {ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                isLight ? "hover:bg-zinc-100" : "hover:bg-zinc-800"
              }`}
              onClick={() => pick(item.key)}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
