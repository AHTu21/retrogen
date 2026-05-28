import { normalizeAppearanceColor } from "../../lib/messengerProfileAppearance";

type Preset = { id: string; label: string; hex: string };

type Props = {
  value: string;
  onChange: (hex: string) => void;
  presets: Preset[];
  isLight: boolean;
  /** Только поле «Свой цвет» (пресеты выбраны отдельно, напр. плашками) */
  hidePresets?: boolean;
  /** Узкое поле hex для колонок и секций фона */
  compact?: boolean;
};

export function MessengerAppearanceColorField({
  value,
  onChange,
  presets,
  isLight,
  hidePresets,
  compact,
}: Props) {
  const current = normalizeAppearanceColor(value);
  const pickerValue = current || "#e4e4e7";

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {!hidePresets ? (
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const active = (p.hex || "") === current;
          return (
            <button
              key={p.id}
              type="button"
              title={p.label}
              aria-label={p.label}
              aria-pressed={active}
              onClick={() => onChange(p.hex)}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] transition-colors ${
                active
                  ? isLight
                    ? "border-sky-600 bg-sky-50 text-sky-900"
                    : "border-sky-500 bg-sky-950/40 text-sky-100"
                  : isLight
                    ? "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                    : "border-zinc-600 bg-zinc-800/60 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              {p.hex ? (
                <span
                  className="size-3.5 shrink-0 rounded-full ring-1 ring-black/15"
                  style={{ backgroundColor: p.hex }}
                  aria-hidden
                />
              ) : (
                <span
                  className={`size-3.5 shrink-0 rounded-full border border-dashed ${
                    isLight ? "border-zinc-400" : "border-zinc-500"
                  }`}
                  aria-hidden
                />
              )}
              {p.label}
            </button>
          );
        })}
      </div>
      ) : null}
      <label
        className={`flex items-center gap-1.5 ${compact ? "text-[10px]" : "text-xs"} ${
          isLight ? "text-zinc-500" : "text-zinc-400"
        }`}
      >
        {!compact ? <span className="shrink-0">Свой цвет</span> : null}
        <input
          type="color"
          value={pickerValue}
          title="Свой цвет"
          aria-label="Свой цвет"
          className={`cursor-pointer rounded border-0 bg-transparent p-0 ${compact ? "size-6" : "size-8"}`}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          value={current}
          placeholder="#rrggbb"
          maxLength={7}
          className={`rounded border px-1.5 py-0.5 font-mono ${
            compact ? "w-[4.75rem] text-[10px]" : "min-w-0 flex-1 text-xs"
          } ${isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-800"}`}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
