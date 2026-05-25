import { useEffect, useMemo, useRef, useState } from "react";
import { getMessengerEmojiPalette, pickMessengerEmoji } from "../../lib/messengerEmoji";
import { IconSmile } from "./MessageComposerIcons";
import { composerInlineIconClass } from "./messengerComposerUi";

type MessageEmojiPickerProps = {
  isLight: boolean;
  onInsert: (emoji: string) => void;
};

export function MessageEmojiPicker({ isLight, onInsert }: MessageEmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const palette = useMemo(() => {
    void tick;
    return getMessengerEmojiPalette();
  }, [tick, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function handlePick(emoji: string) {
    pickMessengerEmoji(emoji);
    setTick((t) => t + 1);
    onInsert(emoji);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        className={composerInlineIconClass(isLight, open)}
        title="Вставить эмодзи"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <IconSmile />
        <span className="sr-only">Эмодзи</span>
      </button>
      {open ? (
        <div
          className={`absolute bottom-full left-0 z-[200] mb-1 max-h-[220px] w-[min(280px,85vw)] overflow-y-auto rounded-xl border p-2 shadow-xl ${
            isLight ? "border-zinc-200 bg-white" : "border-zinc-600 bg-zinc-900"
          }`}
          role="dialog"
          aria-label="Выбор эмодзи"
        >
          <p className="mb-1.5 px-0.5 text-[10px] uppercase tracking-wide opacity-50">
            Эмодзи · также :smile: :fire: :rocket:
          </p>
          <div className="flex flex-wrap gap-0.5">
            {palette.map((em) => (
              <button
                key={em}
                type="button"
                className={`rounded-md px-1.5 py-1 text-xl hover:bg-black/10 ${
                  isLight ? "" : "hover:bg-white/10"
                }`}
                onClick={() => handlePick(em)}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
