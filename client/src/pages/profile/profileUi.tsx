import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { normalizeProfileAccent, PROFILE_ACCENT_PRESETS, type ProfileAccentPreset } from "../../lib/profileAccent";
import type { CursorStyle } from "../../lib/profilePrefs";
import { cursorCss, effectiveBoardWallpaper } from "../../lib/profilePrefs";
import { resolveBoardPreviewColors } from "../../lib/profileRoomColors";
import type { ProfileDesign } from "./profileDesign";
import { PROFILE_NAV, type ProfileSectionId } from "./profileHubTheme";

const CURSOR_OPTIONS: { id: CursorStyle; label: string }[] = [
  { id: "default", label: "Обычный" },
  { id: "pointer", label: "Рука" },
  { id: "grab", label: "Захват" },
  { id: "crosshair", label: "Прицел" },
];

/** Единый каркас любой секции профиля. */
export function ProfileSectionFrame({
  d,
  sectionId,
  children,
  aside,
  compact,
}: {
  d: ProfileDesign;
  sectionId: ProfileSectionId;
  children: ReactNode;
  aside?: ReactNode;
  compact?: boolean;
}) {
  const meta = PROFILE_NAV.find((n) => n.id === sectionId);
  if (!meta) return null;
  return (
    <div className={compact ? "flex min-h-0 w-full flex-1 flex-col" : "min-w-0 w-full"}>
      <header className={compact ? "mb-4 shrink-0" : "mb-4 sm:mb-5"}>
        <p className={d.eyebrow}>Настройки</p>
        <h1 className={`mt-0.5 ${d.sectionTitle}`}>{meta.label}</h1>
        {meta.hint && !compact ? <p className={d.sectionHint}>{meta.hint}</p> : null}
      </header>
      {aside ? (
        <div className="grid items-start gap-4 md:gap-5 lg:grid-cols-[minmax(0,1fr)_min(100%,17rem)] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_15.5rem]">
          <div className="min-w-0 space-y-4 md:space-y-5">{children}</div>
          <div className="min-w-0 lg:sticky lg:top-24">{aside}</div>
        </div>
      ) : compact ? (
        <div className="flex min-h-0 w-full flex-1 flex-col">{children}</div>
      ) : (
        <div className="space-y-4 md:space-y-5">{children}</div>
      )}
    </div>
  );
}

export function ProfileCard({
  d,
  title,
  description,
  children,
  className = "",
}: {
  d: ProfileDesign;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-1.5">
        <h2 className={d.h2}>{title}</h2>
        {description ? <p className={`mt-0.5 text-[0.75rem] leading-relaxed ${d.muted}`}>{description}</p> : null}
      </div>
      <div className={`overflow-hidden ${d.card}`}>{children}</div>
    </section>
  );
}

export function ProfileField({
  d,
  label,
  hint,
  children,
  divided,
}: {
  d: ProfileDesign;
  label: string;
  hint?: string;
  children: ReactNode;
  divided?: boolean;
}) {
  return (
    <div
      className={`grid gap-2 px-4 py-2.5 md:grid-cols-[8.75rem_minmax(0,1fr)] md:gap-5 md:py-3 ${
        divided ? "border-t border-[var(--ph-separator)]" : ""
      }`}
    >
      <div className="min-w-0 md:pt-1">
        <p className="text-[0.8125rem] text-[var(--ph-text)]">{label}</p>
        {hint ? <p className={`mt-0.5 text-[0.75rem] leading-relaxed ${d.muted}`}>{hint}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ProfileMetrics({
  d,
  items,
}: {
  d: ProfileDesign;
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className={d.statTile}>
          <p className={d.label}>{item.label}</p>
          <p className="mt-1 text-[1.375rem] font-semibold tabular-nums tracking-[-0.02em] text-[var(--ph-text)]">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ProfileActions({ children }: { d: ProfileDesign; children: ReactNode }) {
  return <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2.5 [&_a]:w-full sm:[&_a]:w-auto [&_button]:w-full sm:[&_button]:w-auto">{children}</div>;
}

export function ProfileListRow({
  d,
  to,
  title,
  badge,
}: {
  d: ProfileDesign;
  to: string;
  title: string;
  badge: { text: string; live: boolean };
}) {
  return (
    <Link
      to={to}
      className={`flex items-center justify-between gap-4 px-5 py-3.5 text-[0.9375rem] transition hover:bg-[var(--ph-nav-hover)] ${d.cardInset}`}
    >
      <span className="font-medium text-[var(--ph-text)]">{title}</span>
      <span className="flex shrink-0 items-center gap-2">
        <span className={`px-2 py-0.5 text-[0.6875rem] font-medium ${d.rFull} ${badge.live ? d.badgeLive : d.badgeDone}`}>
          {badge.text}
        </span>
        <svg className={`h-4 w-4 ${d.muted}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </Link>
  );
}

export function ProfileEmpty({ d, children }: { d: ProfileDesign; children: ReactNode }) {
  return (
    <div className={`px-8 py-14 text-center ${d.muted}`}>
      <p className="text-[0.9375rem] leading-relaxed">{children}</p>
    </div>
  );
}

/** Горизонтальный ряд цветов + пипетка — для компактной страницы «Доска». */
export function CompactColorRow({
  d,
  label,
  value,
  onChange,
  presets,
  normalize,
}: {
  d: ProfileDesign;
  label: string;
  value: string;
  onChange: (hex: string) => void;
  presets: ProfileAccentPreset[];
  normalize: (raw: string) => string;
}) {
  const norm = normalize(value);
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="w-[4.5rem] shrink-0 text-[0.8125rem] text-[var(--ph-muted)] sm:w-[5.5rem]">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:gap-2">
        {presets.map((preset) => {
          const active = norm === preset.hex;
          return (
            <button
              key={preset.id}
              type="button"
              title={preset.label}
              onClick={() => onChange(preset.hex)}
              className={`h-7 w-7 shrink-0 rounded-full ring-1 ring-black/10 transition dark:ring-white/15 sm:h-8 sm:w-8 ${
                active
                  ? "ring-2 ring-[var(--ph-accent)] ring-offset-1 ring-offset-[var(--ph-surface)]"
                  : "hover:scale-110"
              }`}
              style={{ backgroundColor: preset.hex }}
              aria-label={preset.label}
              aria-pressed={active}
            />
          );
        })}
        <label
          className={`relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-1 ring-[var(--ph-border)] transition hover:ring-[var(--ph-accent)]/50 sm:h-8 sm:w-8 ${d.rFull}`}
          title="Свой цвет"
        >
          <input
            type="color"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={norm}
            onChange={(e) => onChange(normalize(e.target.value))}
          />
          <span
            className="pointer-events-none block h-full w-full"
            style={{
              background: `conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #8b5cf6, #ef4444)`,
            }}
          />
        </label>
      </div>
    </div>
  );
}

export function CompactWallpaperField({
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
    <div className="flex flex-wrap items-center gap-2 border-t border-[var(--ph-separator)] pt-2.5">
      <span className="w-[4.5rem] shrink-0 text-[0.75rem] text-[var(--ph-muted)]">Обои</span>
      <label className={`cursor-pointer ${d.btnSecondary} !px-3 !py-1.5 text-[0.75rem]`}>
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} />
        {hasFile ? "Заменить" : "Загрузить"}
      </label>
      {hasFile ? (
        <button type="button" className={`text-[0.75rem] font-medium text-red-600 dark:text-red-400`} onClick={onClear}>
          Удалить
        </button>
      ) : null}
      <span className={`text-[0.6875rem] ${d.muted}`}>не аватар</span>
    </div>
  );
}

/** Палитра + пипетка (input type=color), без ручного CSS. */
export function ProfileColorPicker({
  d,
  value,
  onChange,
  presets,
  normalize,
  pipetteLabel = "Свой цвет",
}: {
  d: ProfileDesign;
  value: string;
  onChange: (hex: string) => void;
  presets: ProfileAccentPreset[];
  normalize: (raw: string) => string;
  pipetteLabel?: string;
}) {
  const norm = normalize(value);
  return (
    <div className="space-y-3 px-4 py-3">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 md:grid-cols-8">
        {presets.map((preset) => {
          const active = norm === preset.hex;
          return (
            <button
              key={preset.id}
              type="button"
              title={preset.label}
              onClick={() => onChange(preset.hex)}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-2 transition ${
                active ? "ring-2 ring-[var(--ph-accent)] ring-offset-2 ring-offset-[var(--ph-surface)]" : "hover:bg-[var(--ph-nav-hover)]"
              }`}
            >
              <span
                className="h-7 w-7 rounded-full shadow-sm ring-1 ring-black/8 dark:ring-white/12"
                style={{ backgroundColor: preset.hex }}
              />
              <span className={`max-w-full truncate text-[0.625rem] ${active ? "font-medium text-[var(--ph-accent)]" : d.label}`}>
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <label
          className={`relative flex h-10 cursor-pointer items-center gap-2 overflow-hidden pl-1 pr-3 ring-1 ring-[var(--ph-border)] transition hover:bg-[var(--ph-nav-hover)] ${d.rSm}`}
          title={pipetteLabel}
        >
          <input
            type="color"
            className="h-8 w-8 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0"
            value={norm}
            onChange={(e) => onChange(normalize(e.target.value))}
          />
          <span className={`text-[0.8125rem] ${d.muted}`}>{pipetteLabel}</span>
        </label>
        <span className={`font-mono text-[0.75rem] tabular-nums ${d.muted}`}>{norm}</span>
      </div>
    </div>
  );
}

export function ColorSwatchGrid({ d, value, onChange }: { d: ProfileDesign; value: string; onChange: (hex: string) => void }) {
  return (
    <ProfileColorPicker
      d={d}
      value={value}
      onChange={onChange}
      presets={PROFILE_ACCENT_PRESETS}
      normalize={normalizeProfileAccent}
      pipetteLabel="Пипетка"
    />
  );
}

export function CursorSegmented({
  d,
  value,
  onChange,
  compact,
  stretch,
}: {
  d: ProfileDesign;
  value: CursorStyle;
  onChange: (v: CursorStyle) => void;
  compact?: boolean;
  stretch?: boolean;
}) {
  return (
    <div
      className={`${stretch ? "flex w-full" : "inline-flex flex-wrap"} gap-0.5 p-0.5 ${d.inset} ${d.rSm}`}
      role="group"
      aria-label="Курсор"
    >
      {CURSOR_OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`font-medium transition ${d.rSm} ${
              stretch ? "flex-1 px-2 py-2 text-center text-[0.75rem]" : compact ? "px-2 py-1 text-[0.6875rem]" : "px-3 py-1.5 text-xs"
            } ${
              active
                ? stretch
                  ? "bg-[var(--ph-nav-active-bg)] text-[var(--ph-nav-active-text)]"
                  : d.navActive
                : stretch
                  ? "text-[var(--ph-nav-idle)] hover:bg-[var(--ph-nav-hover)]"
                  : d.navIdle
            }`}
            style={{ cursor: cursorCss(opt.id) }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const RETRO_COLUMNS = ["Плюсы", "Минусы", "Действия"] as const;

/** Превью оформления комнаты — только фон/шапка/обои, не аватар. */
export function BoardPreviewPanel({
  d,
  boardBackdrop,
  headerTint,
  cursorStyle,
  wallpaperDataUrl,
  avatarDataUrl,
  compact,
  fill,
}: {
  d: ProfileDesign;
  boardBackdrop: string;
  headerTint: string;
  cursorStyle: CursorStyle;
  wallpaperDataUrl: string | null;
  avatarDataUrl: string | null;
  compact?: boolean;
  fill?: boolean;
}) {
  const { bg: previewBg, header: previewHeader, isLightBoard } = resolveBoardPreviewColors(
    boardBackdrop,
    headerTint,
    avatarDataUrl,
  );
  const wallpaper = effectiveBoardWallpaper({ wallpaperDataUrl, avatarDataUrl });
  const hasWallpaper = !!wallpaper;

  const previewClass = fill
    ? "relative min-h-[12rem] w-full flex-1 overflow-hidden rounded-lg md:min-h-0"
    : compact
      ? "relative min-h-[7.5rem] overflow-hidden rounded-lg ring-1 ring-[var(--ph-border)]"
      : "relative min-h-[10rem] overflow-hidden rounded-xl ring-1 ring-[var(--ph-border)] sm:min-h-[11rem]";

  return (
    <div className={`w-full ${fill ? "flex min-h-0 flex-1 flex-col" : ""}`} aria-label="Превью доски ретро">
      <div
          className={previewClass}
          style={{
            background: previewBg,
            cursor: cursorCss(cursorStyle),
          }}
        >
          {hasWallpaper ? (
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage: `url(${wallpaper})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              aria-hidden
            />
          ) : null}
          <div
            className={`absolute inset-x-0 top-0 z-10 border-b border-black/5 ${fill ? "h-10" : compact ? "h-7" : "h-9"}`}
            style={{ background: previewHeader }}
          />
          <div
            className={`absolute inset-0 z-[1] flex items-stretch ${
              fill ? "gap-2 p-4 pt-12" : compact ? "gap-1 p-2 pt-8" : "gap-1.5 p-3 pt-11"
            }`}
          >
            {RETRO_COLUMNS.map((t) => (
              <div
                key={t}
                className={`flex flex-1 flex-col overflow-hidden rounded-md backdrop-blur-sm ${
                  isLightBoard
                    ? "bg-white/88 shadow-sm ring-1 ring-black/8"
                    : "bg-zinc-900/75 ring-1 ring-white/12"
                }`}
              >
                <div
                  className={`border-b px-2 py-1.5 text-center text-[0.625rem] font-medium tracking-wide ${
                    isLightBoard ? "border-black/8 text-zinc-600" : "border-white/10 text-zinc-400"
                  }`}
                >
                  {t}
                </div>
                <div className="flex-1" />
              </div>
            ))}
          </div>
          <div
            className={`absolute bottom-3 right-3 z-10 max-w-[7rem] rounded-lg px-2 py-1.5 text-[0.6875rem] font-medium leading-snug shadow-md ${
              isLightBoard ? "bg-amber-200/95 text-amber-950" : "bg-amber-400/95 text-amber-950"
            }`}
          >
            Стикер
          </div>
        </div>
      {!compact && !fill ? (
        <p className={`mt-2 text-[0.75rem] ${d.muted}`}>
          {hasWallpaper ? "Обои поверх фона (40%)." : "Только цвет фона и шапки."}
        </p>
      ) : null}
    </div>
  );
}

export function FileUploadZone({
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
    <div>
      <label
        className={`flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-[var(--ph-input-border)] px-4 py-8 text-center transition hover:bg-[var(--ph-nav-hover)] ${d.rSm}`}
      >
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} />
        <span className="text-[0.9375rem] font-medium text-[var(--ph-text)]">{hasFile ? "Заменить файл" : "Загрузить обои"}</span>
        <span className={`mt-1 text-[0.8125rem] ${d.muted}`}>PNG или JPG, до ~900 KB</span>
      </label>
      {hasFile ? (
        <button type="button" className={`mt-2 text-[0.8125rem] font-medium text-red-600 hover:opacity-80 dark:text-red-400`} onClick={onClear}>
          Удалить
        </button>
      ) : null}
    </div>
  );
}
