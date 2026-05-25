import type { ReactNode } from "react";
import type { ProfileAccentPreset } from "../../lib/profileAccent";
import type { CursorStyle } from "../../lib/profilePrefs";
import { resolveBoardPreviewColors } from "../../lib/profileRoomColors";
import type { ProfileDesign } from "./profileDesign";
import { BoardPreviewPanel, CursorSegmented } from "./profileUi";

type ColorGroupProps = {
  d: ProfileDesign;
  title: string;
  hint?: string;
  value: string;
  presets: ProfileAccentPreset[];
  normalize: (raw: string) => string;
  onChange: (hex: string) => void;
};

export function SettingColorGroup({ d, title, hint, value, presets, normalize, onChange }: ColorGroupProps) {
  const norm = normalize(value);
  return (
    <div className={`${d.rSm} bg-[var(--ph-setting-tray)] p-3.5 sm:p-4`}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <p className="text-[0.8125rem] font-medium text-[var(--ph-text)]">{title}</p>
          {hint ? <p className={`mt-0.5 text-[0.6875rem] ${d.muted}`}>{hint}</p> : null}
        </div>
        <span className={`shrink-0 font-mono text-[0.6875rem] tabular-nums ${d.muted}`}>{norm}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
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
                  ? "ring-2 ring-[var(--ph-accent)] ring-offset-2 ring-offset-[var(--ph-setting-tray)]"
                  : "ring-1 ring-black/10 hover:scale-105 dark:ring-white/12"
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

export function RoomPreviewStage({
  d,
  boardBackdrop,
  headerTint,
  cursorStyle,
  wallpaperDataUrl,
  avatarDataUrl,
}: {
  d: ProfileDesign;
  boardBackdrop: string;
  headerTint: string;
  cursorStyle: CursorStyle;
  wallpaperDataUrl: string | null;
  avatarDataUrl: string | null;
}) {
  const { bg, isLightBoard } = resolveBoardPreviewColors(boardBackdrop, headerTint, avatarDataUrl);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--ph-separator)] bg-[var(--ph-surface-elevated)]/50 px-5 py-3 sm:px-7">
        <div>
          <p className="text-[0.8125rem] font-semibold text-[var(--ph-text)]">Превью доски</p>
          <p className={`mt-0.5 text-[0.6875rem] ${d.muted}`}>Как увидят участники в комнате</p>
        </div>
        <span className={`${d.badgeLive} px-2.5 py-1 text-[0.625rem] font-medium ${d.rFull}`}>live</span>
      </div>
      <div
        className="relative flex min-h-[12rem] flex-1 flex-col p-3 sm:p-4"
        style={{ backgroundColor: bg }}
      >
        <div
          className={`pointer-events-none absolute inset-0 ${d.r}`}
          style={{
            boxShadow: isLightBoard
              ? "inset 0 0 0 1px rgb(0 0 0 / 0.06)"
              : "inset 0 0 0 1px rgb(255 255 255 / 0.08)",
          }}
          aria-hidden
        />
        <BoardPreviewPanel
          d={d}
          fill
          boardBackdrop={boardBackdrop}
          headerTint={headerTint}
          cursorStyle={cursorStyle}
          wallpaperDataUrl={wallpaperDataUrl}
          avatarDataUrl={avatarDataUrl}
        />
      </div>
    </div>
  );
}

export function RoomSettingRow({
  d,
  title,
  hint,
  children,
}: {
  d: ProfileDesign;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${d.rSm} bg-[var(--ph-setting-tray)] p-3.5 sm:p-4`}>
      <div className="mb-3">
        <p className="text-[0.8125rem] font-medium text-[var(--ph-text)]">{title}</p>
        {hint ? <p className={`mt-0.5 text-[0.6875rem] ${d.muted}`}>{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function RoomCursorField({
  d,
  value,
  onChange,
}: {
  d: ProfileDesign;
  value: CursorStyle;
  onChange: (v: CursorStyle) => void;
}) {
  return (
    <RoomSettingRow d={d} title="Курсор" hint="Вид указателя на доске">
      <CursorSegmented d={d} value={value} onChange={onChange} stretch />
    </RoomSettingRow>
  );
}

export function RoomWallpaperField({
  d,
  hasFile,
  onPick,
  onClear,
}: {
  d: ProfileDesign;
  hasFile: boolean;
  onPick: (f: File | undefined) => void;
  onClear: () => void;
}) {
  return (
    <RoomSettingRow d={d} title="Обои доски" hint="Отдельно от фото профиля">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className={`cursor-pointer ${d.btnSecondary}`}>
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} />
          {hasFile ? "Заменить файл" : "Загрузить изображение"}
        </label>
        {hasFile ? (
          <button type="button" className={`text-[0.8125rem] font-medium text-red-500/90`} onClick={onClear}>
            Удалить
          </button>
        ) : null}
      </div>
    </RoomSettingRow>
  );
}
