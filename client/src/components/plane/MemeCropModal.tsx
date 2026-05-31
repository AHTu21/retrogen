import { useCallback, useEffect, useRef, useState } from "react";
import type { MemeCropDto } from "../../types";

type Props = {
  src: string;
  initialCrop?: MemeCropDto;
  onApply: (crop: MemeCropDto) => void;
  onCancel: () => void;
  isLight: boolean;
};

type DragMode = "move" | "nw" | "ne" | "sw" | "se" | null;

function clampCrop(c: MemeCropDto): MemeCropDto {
  let { x, y, w, h } = c;
  w = Math.max(0.05, Math.min(1, w));
  h = Math.max(0.05, Math.min(1, h));
  x = Math.max(0, Math.min(1 - w, x));
  y = Math.max(0, Math.min(1 - h, y));
  return { x, y, w, h };
}

export function MemeCropModal({ src, initialCrop, onApply, onCancel, isLight }: Props) {
  const [crop, setCrop] = useState<MemeCropDto>(initialCrop ?? { x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const [drag, setDrag] = useState<{ mode: DragMode; startX: number; startY: number; start: MemeCropDto } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (mode: DragMode) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag({ mode, startX: e.clientX, startY: e.clientY, start: crop });
  };

  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!drag || !boxRef.current) return;
      const rect = boxRef.current.getBoundingClientRect();
      const dx = (e.clientX - drag.startX) / rect.width;
      const dy = (e.clientY - drag.startY) / rect.height;
      const s = drag.start;
      if (drag.mode === "move") {
        setCrop(clampCrop({ ...s, x: s.x + dx, y: s.y + dy }));
        return;
      }
      let next = { ...s };
      if (drag.mode?.includes("e")) next.w = s.w + dx;
      if (drag.mode?.includes("w")) {
        next.x = s.x + dx;
        next.w = s.w - dx;
      }
      if (drag.mode?.includes("s")) next.h = s.h + dy;
      if (drag.mode?.includes("n")) {
        next.y = s.y + dy;
        next.h = s.h - dy;
      }
      setCrop(clampCrop(next));
    },
    [drag],
  );

  useEffect(() => {
    if (!drag) return;
    window.addEventListener("mousemove", onMove);
    const up = () => setDrag(null);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", up);
    };
  }, [drag, onMove]);

  const overlay = isLight ? "bg-black/40" : "bg-black/55";
  const panel = isLight ? "bg-white text-zinc-900" : "bg-zinc-900 text-white";

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className={`max-w-lg rounded-xl p-4 shadow-2xl ${panel}`}>
        <h3 className="mb-3 text-sm font-semibold">Обрезка картинки</h3>
        <div ref={boxRef} className="relative mx-auto aspect-video w-full max-w-md select-none overflow-hidden rounded-lg bg-zinc-800">
          <img src={src} alt="" className="h-full w-full object-contain" draggable={false} />
          <div
            className={`absolute border-2 border-sky-400 ${overlay}`}
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.w * 100}%`,
              height: `${crop.h * 100}%`,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
            }}
            onMouseDown={onMouseDown("move")}
          >
            {(["nw", "ne", "sw", "se"] as const).map((corner) => (
              <span
                key={corner}
                className="absolute h-3 w-3 rounded-full bg-sky-400"
                style={{
                  left: corner.includes("w") ? -6 : undefined,
                  right: corner.includes("e") ? -6 : undefined,
                  top: corner.includes("n") ? -6 : undefined,
                  bottom: corner.includes("s") ? -6 : undefined,
                  cursor: `${corner}-resize`,
                }}
                onMouseDown={onMouseDown(corner)}
              />
            ))}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded px-3 py-1.5 text-sm opacity-80 hover:opacity-100" onClick={onCancel}>
            Отмена
          </button>
          <button
            type="button"
            className="rounded bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-500"
            onClick={() => onApply(clampCrop(crop))}
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
