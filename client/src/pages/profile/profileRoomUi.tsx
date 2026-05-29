import { useCallback, useState, type DragEvent, type ReactNode } from "react";
import type { ProfileAccentPreset } from "../../lib/profileAccent";
import { DEFAULT_WALLPAPER_OPACITY, cursorCss, effectiveBoardWallpaper, type CursorStyle, type UserProfilePrefs } from "../../lib/profilePrefs";
import {
  normalizeBoardBackdropColor,
  normalizeHeaderTintColor,
  roomPaletteContrastHint,
} from "../../lib/profileRoomColors";
import type { ProfileDesign } from "./profileDesign";
import { ROOM_THEME_PRESETS, roomPresetMatches, type RoomThemePreset } from "./profileRoomPresets";
import { BoardPreviewPanel, ProfileCard } from "./profileUi";

const CURSOR_OPTIONS: {
  id: CursorStyle;
  label: string;
  hint: string;
  glyph: string;
}[] = [
  { id: "default", label: "Обычный", hint: "Стандартный указатель", glyph: "↖" },
  { id: "pointer", label: "Рука", hint: "Клик по стикерам", glyph: "☝" },
  { id: "grab", label: "Захват", hint: "Панорама доски", glyph: "✊" },
  { id: "crosshair", label: "Прицел", hint: "Точное позиционирование", glyph: "+" },
];

type ColorGroupProps = {
  d: ProfileDesign;
  title: string;
  hint?: string;
  value: string;
  presets: ProfileAccentPreset[];
  normalize: (raw: string) => string;
  onChange: (hex: string) => void;
};

/** Компактная палитра: кружки + пипетка, HEX справа в заголовке */
export function SettingColorGroup({ d, title, hint, value, presets, normalize, onChange }: ColorGroupProps) {
  const norm = normalize(value);
  return (
    <div className={`min-w-0 max-w-full overflow-hidden ${d.rSm} bg-[var(--ph-setting-tray)] p-3.5 sm:p-4`}>
      <div className="mb-3 flex min-w-0 items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-medium text-[var(--ph-text)]">{title}</p>
          {hint ? <p className={`mt-0.5 text-[0.6875rem] leading-relaxed ${d.muted}`}>{hint}</p> : null}
        </div>
        <span className={`shrink-0 font-mono text-[0.6875rem] tabular-nums ${d.muted}`}>{norm}</span>
      </div>
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 overflow-hidden p-0.5">
        {presets.map((preset) => {
          const active = norm === preset.hex;
          return (
            <button
              key={preset.id}
              type="button"
              title={preset.label}
              onClick={() => onChange(preset.hex)}
              className={`h-8 w-8 shrink-0 rounded-full transition ${
                active
                  ? "ring-2 ring-[var(--ph-accent)]"
                  : "ring-1 ring-black/10 hover:opacity-90 dark:ring-white/12"
              }`}
              style={{ backgroundColor: preset.hex }}
              aria-label={preset.label}
              aria-pressed={active}
            />
          );
        })}
        <label
          className={`relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-1 ring-[var(--ph-border)] transition hover:ring-[var(--ph-accent)]/40 ${d.rFull}`}
          title="Свой цвет"
        >
          <input
            type="color"
            className="absolute inset-0 cursor-pointer opacity-0"
            value={norm}
            onChange={(e) => onChange(normalize(e.target.value))}
          />
          <span
            className="block h-full w-full"
            style={{
              background: `conic-gradient(from 180deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)`,
            }}
          />
        </label>
      </div>
    </div>
  );
}

export function RoomLivePreview({
  d,
  prefs,
}: {
  d: ProfileDesign;
  prefs: Pick<
    UserProfilePrefs,
    "boardBackdrop" | "headerTint" | "cursorStyle" | "wallpaperDataUrl" | "avatarDataUrl" | "wallpaperOpacity"
  >;
}) {
  const hasWallpaper = !!effectiveBoardWallpaper(prefs);
  const contrastHint = roomPaletteContrastHint(prefs.boardBackdrop, prefs.headerTint);

  return (
    <div className={`overflow-hidden ${d.insetGroup}`}>
      <div className="border-b border-[var(--ph-separator)] bg-[var(--ph-surface-elevated)] px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.8125rem] font-semibold tracking-[-0.01em] text-[var(--ph-text)]">Живое превью</p>
            <p className={`mt-0.5 text-[0.75rem] leading-relaxed ${d.muted}`}>
              Так увидят доску участники в комнате — без перезагрузки
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide ${d.badgeLive} ${d.rFull}`}
          >
            <span className="relative inline-flex h-3 w-3 shrink-0 overflow-hidden rounded-full">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative m-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <PreviewLegendChip label="Фон" color={normalizeBoardBackdropColor(prefs.boardBackdrop)} />
          <PreviewLegendChip label="Шапка" color={normalizeHeaderTintColor(prefs.headerTint)} />
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1 ring-[var(--ph-border)] ${
              hasWallpaper ? "bg-[var(--ph-nav-active-bg)] text-[var(--ph-accent)]" : `${d.muted} bg-[var(--ph-surface)]`
            }`}
          >
            {hasWallpaper ? "Обои включены" : "Без обоев"}
          </span>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <BoardPreviewPanel
          d={d}
          studio
          boardBackdrop={prefs.boardBackdrop}
          headerTint={prefs.headerTint}
          cursorStyle={prefs.cursorStyle}
          wallpaperDataUrl={prefs.wallpaperDataUrl}
          avatarDataUrl={prefs.avatarDataUrl}
          wallpaperOpacity={prefs.wallpaperOpacity}
        />
        {contrastHint ? (
          <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-[0.75rem] leading-relaxed text-amber-900 ring-1 ring-amber-500/20 dark:text-amber-100">
            {contrastHint}
          </p>
        ) : (
          <p className={`mt-3 text-[0.75rem] leading-relaxed ${d.muted}`}>
            {hasWallpaper
              ? `Изображение накладывается на фон (${prefs.wallpaperOpacity}% непрозрачности) — колонки остаются читаемыми.`
              : "Добавьте обои ниже или выберите готовую тему для быстрого старта."}
          </p>
        )}
      </div>
    </div>
  );
}

function PreviewLegendChip({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ph-surface)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--ph-text)] ring-1 ring-[var(--ph-border)]">
      <span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function RoomQuickThemes({
  d,
  boardBackdrop,
  headerTint,
  onApply,
}: {
  d: ProfileDesign;
  boardBackdrop: string;
  headerTint: string;
  onApply: (preset: RoomThemePreset) => void;
}) {
  return (
    <section className="space-y-2">
      <div className="px-0.5">
        <h2 className={d.groupTitle}>Готовые темы</h2>
        <p className={d.groupDesc}>Один клик — фон, шапка и при необходимости курсор</p>
      </div>
      <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${d.insetGroup} p-2.5 sm:p-3`}>
        {ROOM_THEME_PRESETS.map((preset) => {
          const active = roomPresetMatches(
            preset,
            boardBackdrop,
            headerTint,
            normalizeBoardBackdropColor,
            normalizeHeaderTintColor,
          );
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApply(preset)}
              className={`flex w-full min-w-0 flex-col overflow-hidden border text-left transition ${d.rSm} ${
                active
                  ? "border-2 border-[var(--ph-accent)] bg-[var(--ph-nav-active-bg)]"
                  : "border border-[var(--ph-border)] bg-[var(--ph-surface-elevated)] hover:bg-[var(--ph-nav-hover)]"
              }`}
              aria-pressed={active}
            >
              <div className="relative h-[3.25rem] w-full" style={{ background: preset.boardBackdrop }}>
                <div
                  className="absolute inset-x-0 top-0 h-[38%] border-b border-black/10"
                  style={{ background: preset.headerTint }}
                />
                <div className="absolute inset-x-2 bottom-2 flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-4 flex-1 rounded-sm bg-white/75 ring-1 ring-black/8 dark:bg-zinc-900/70 dark:ring-white/10"
                    />
                  ))}
                </div>
              </div>
              <div className="border-t border-[var(--ph-separator)] px-2.5 py-2">
                <p className="text-[0.75rem] font-semibold text-[var(--ph-text)]">{preset.label}</p>
                <p className={`mt-0.5 line-clamp-2 text-[0.625rem] leading-snug ${d.muted}`}>{preset.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function RoomCursorPicker({
  d,
  value,
  onChange,
}: {
  d: ProfileDesign;
  value: CursorStyle;
  onChange: (v: CursorStyle) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {CURSOR_OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-center transition ring-1 ${
              active
                ? "bg-[var(--ph-nav-active-bg)] ring-[var(--ph-accent)]/50"
                : "bg-[var(--ph-surface-elevated)] ring-[var(--ph-border)] hover:bg-[var(--ph-nav-hover)]"
            }`}
            style={{ cursor: cursorCss(opt.id) }}
            aria-pressed={active}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${
                active ? "bg-[var(--ph-panel-bg)] text-[var(--ph-accent)]" : "bg-[var(--ph-surface)] text-[var(--ph-text)]"
              }`}
            >
              {opt.glyph}
            </span>
            <span className="text-[0.75rem] font-medium text-[var(--ph-text)]">{opt.label}</span>
            <span className={`text-[0.625rem] leading-snug ${d.muted}`}>{opt.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

export function RoomWallpaperOpacity({
  d,
  value,
  hasWallpaper,
  onChange,
}: {
  d: ProfileDesign;
  value: number;
  hasWallpaper: boolean;
  onChange: (opacity: number) => void;
}) {
  return (
    <div className={`space-y-2 ${!hasWallpaper ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.8125rem] font-medium text-[var(--ph-text)]">Прозрачность обоев</span>
        <span className={`font-mono text-[0.75rem] tabular-nums ${d.muted}`}>{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        disabled={!hasWallpaper}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-[var(--ph-accent)] disabled:cursor-not-allowed"
        aria-label="Прозрачность обоев на доске"
      />
      <p className={`text-[0.6875rem] leading-relaxed ${d.muted}`}>
        {hasWallpaper
          ? "Так же отображается в комнате и в живом превью выше."
          : `Загрузите обои — по умолчанию ${DEFAULT_WALLPAPER_OPACITY}%.`}
      </p>
    </div>
  );
}

export function RoomStyleResetBar({
  d,
  onReset,
}: {
  d: ProfileDesign;
  onReset: () => void;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${d.rSm} bg-[var(--ph-surface-elevated)] px-4 py-3 ring-1 ring-[var(--ph-border)]`}>
      <p className={`text-[0.8125rem] ${d.muted}`}>Вернуть фон, шапку, курсор и обои к значениям по умолчанию</p>
      <button
        type="button"
        className={d.btnSecondary}
        onClick={() => {
          if (window.confirm("Сбросить оформление доски? Обои будут удалены.")) onReset();
        }}
      >
        Сбросить оформление
      </button>
    </div>
  );
}

export function RoomWallpaperStudio({
  d,
  wallpaperDataUrl,
  hasFile,
  onPick,
  onClear,
}: {
  d: ProfileDesign;
  wallpaperDataUrl: string | null;
  hasFile: boolean;
  onPick: (f: File | undefined) => void;
  onClear: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f?.type.startsWith("image/")) onPick(f);
    },
    [onPick],
  );

  if (hasFile && wallpaperDataUrl) {
    return (
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center ${d.rSm} bg-[var(--ph-surface-elevated)] p-3 ring-1 ring-[var(--ph-border)]`}>
        <div
          className={`h-20 w-full shrink-0 overflow-hidden bg-[var(--ph-surface)] sm:h-16 sm:w-28 ${d.rSm} ring-1 ring-[var(--ph-border)]`}
          style={{
            backgroundImage: `url(${wallpaperDataUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          role="img"
          aria-label="Миниатюра обоев"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] font-medium text-[var(--ph-text)]">Обои загружены</p>
          <p className={`mt-0.5 text-[0.75rem] ${d.muted}`}>Отображаются поверх цвета фона в комнате</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <label className={`cursor-pointer ${d.btnSecondary}`}>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} />
              Заменить
            </label>
            <button type="button" className={`${d.btnGhost} text-red-600 dark:text-red-400`} onClick={onClear}>
              Удалить
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-4 py-8 text-center transition ${d.rSm} ${
        dragOver
          ? "border-[var(--ph-accent)] bg-[var(--ph-nav-active-bg)]"
          : "border-[var(--ph-input-border)] hover:border-[var(--ph-accent)]/50 hover:bg-[var(--ph-nav-hover)]"
      }`}
    >
      <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} />
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ph-surface-elevated)] text-lg ring-1 ring-[var(--ph-border)]">
        🖼
      </span>
      <span className="text-[0.9375rem] font-medium text-[var(--ph-text)]">Перетащите изображение или нажмите</span>
      <span className={`max-w-xs text-[0.8125rem] leading-relaxed ${d.muted}`}>
        PNG или JPG, до ~900 KB. Не путать с аватаром профиля.
      </span>
    </label>
  );
}

export function RoomPaletteSection({
  d,
  children,
}: {
  d: ProfileDesign;
  children: ReactNode;
}) {
  return <ProfileCard d={d} title="Палитра комнаты" description="Цвета применяются на доске /r/… в реальном времени">{children}</ProfileCard>;
}
