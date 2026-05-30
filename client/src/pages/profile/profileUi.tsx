import type { InputHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { normalizeProfileAccent, PROFILE_ACCENT_PRESETS, type ProfileAccentPreset } from "../../lib/profileAccent";
import type { CursorStyle } from "../../lib/profilePrefs";
import {
  DEFAULT_WALLPAPER_OPACITY,
  cursorCss,
  effectiveBoardWallpaper,
  normalizeWallpaperOpacity,
  wallpaperOpacityFraction,
} from "../../lib/profilePrefs";
import { resolveBoardPreviewColors } from "../../lib/profileRoomColors";
import type { ProfileDesign } from "./profileDesign";
import { PROFILE_NAV, type ProfileSectionId } from "./profileHubTheme";

const CURSOR_OPTIONS: { id: CursorStyle; label: string }[] = [
  { id: "default", label: "Обычный" },
  { id: "pointer", label: "Рука" },
  { id: "grab", label: "Захват" },
  { id: "crosshair", label: "Прицел" },
];

/** Каркас секции: заголовок detail-pane + контент (max ~42rem). */
export function ProfileSectionFrame({
  d,
  sectionId,
  children,
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
  const lead = meta.hint ?? meta.lockReason;
  return (
    <div className={compact ? "flex min-h-0 w-full flex-1 flex-col" : "min-w-0 w-full max-w-full overflow-x-clip"}>
      <header className={compact ? "mb-4 shrink-0 border-b border-[var(--ph-separator)] pb-4" : "mb-6 border-b border-[var(--ph-separator)] pb-5"}>
        <h1 className={d.pageTitle}>{meta.label}</h1>
        {lead && !compact ? <p className={d.pageLead}>{lead}</p> : null}
      </header>
      {compact ? (
        <div className="flex min-h-0 w-full flex-1 flex-col">{children}</div>
      ) : (
        <div className="space-y-6">{children}</div>
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
    <section className={`space-y-2 ${className}`}>
      {(title || description) && (
        <div className="px-0.5">
          {title ? <h2 className={d.groupTitle}>{title}</h2> : null}
          {description ? <p className={d.groupDesc}>{description}</p> : null}
        </div>
      )}
      <div className={`min-w-0 divide-y ${d.divider} ${d.insetGroup}`}>{children}</div>
    </section>
  );
}

export function ProfileField({
  d,
  label,
  hint,
  children,
  divided,
  stacked,
}: {
  d: ProfileDesign;
  label: string;
  hint?: string;
  children: ReactNode;
  divided?: boolean;
  /** Полная ширина подписи сверху (для textarea) */
  stacked?: boolean;
}) {
  return (
    <div
      className={`px-4 py-3.5 sm:py-4 ${divided ? `border-t ${d.insetRow}` : ""} ${
        stacked
          ? "space-y-2"
          : `grid gap-2 sm:grid-cols-[9.75rem_minmax(0,1fr)] sm:gap-x-6 sm:gap-y-1 ${
              hint ? "sm:items-start" : "sm:items-center"
            }`
      }`}
    >
      <div className={`min-w-0 ${stacked ? "" : "sm:pt-0"}`}>
        <p className="text-[0.8125rem] font-medium leading-snug text-[var(--ph-text)]">{label}</p>
        {hint ? <p className={`mt-0.5 text-[0.75rem] leading-relaxed ${d.muted}`}>{hint}</p> : null}
      </div>
      <div className="min-w-0 w-full [&_input]:w-full [&_select]:w-full [&_textarea]:w-full">{children}</div>
    </div>
  );
}

/** Поле ввода с префиксом (@, https:// …) — одна рамка, выровненная ширина с обычными input */
export function ProfilePrefixedInput({
  d,
  prefix,
  className = "",
  ...props
}: {
  d: ProfileDesign;
  prefix: string;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className">) {
  return (
    <div
      className={`flex w-full overflow-hidden ring-1 ring-[var(--ph-input-border)] transition focus-within:ring-2 focus-within:ring-[var(--ph-accent)]/30 ${d.rSm} bg-[var(--ph-input-bg)] ${className}`}
    >
      <span className="flex shrink-0 items-center border-r border-[var(--ph-input-border)] bg-[var(--ph-surface-elevated)] px-3 text-[0.8125rem] font-medium text-[var(--ph-muted)]">
        {prefix}
      </span>
      <input
        className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-[0.8125rem] leading-none text-[var(--ph-text)] outline-none placeholder:text-[var(--ph-muted)]"
        {...props}
      />
    </div>
  );
}

export function ProfileCharCount({ d, current, max }: { d: ProfileDesign; current: number; max: number }) {
  return (
    <p className={`mt-1.5 text-right text-[0.6875rem] tabular-nums ${d.muted}`}>
      {current}/{max}
    </p>
  );
}

export function ProfileSelect({
  d,
  value,
  onChange,
  options,
}: {
  d: ProfileDesign;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <select className={d.field()} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((opt) => (
        <option key={opt.value || "__empty"} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/** Пустое состояние внутри inset-группы */
export function ProfileInsetEmpty({ d, children }: { d: ProfileDesign; children: ReactNode }) {
  return <p className={`px-4 py-8 text-center text-[0.875rem] leading-relaxed ${d.muted}`}>{children}</p>;
}

/** Строка со значением и действием справа */
export function ProfileValueRow({
  d,
  label,
  hint,
  value,
  action,
  divided,
}: {
  d: ProfileDesign;
  label: string;
  hint?: string;
  value: ReactNode;
  action?: ReactNode;
  divided?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:py-4 ${
        divided ? `border-t ${d.insetRow}` : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-[0.8125rem] font-medium text-[var(--ph-text)]">{label}</p>
        {hint ? <p className={`mt-0.5 text-[0.75rem] ${d.muted}`}>{hint}</p> : null}
        <div className={`mt-1 text-[0.875rem] ${d.muted}`}>{value}</div>
      </div>
      {action ? <div className="flex shrink-0 items-center">{action}</div> : null}
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
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 [&_a]:w-full sm:[&_a]:w-auto [&_button]:w-full sm:[&_button]:w-auto">
      {children}
    </div>
  );
}

export function ProfileListRow({
  d,
  to,
  title,
  subtitle,
  badge,
}: {
  d: ProfileDesign;
  to: string;
  title: string;
  subtitle?: string;
  badge: { text: string; live: boolean };
}) {
  return (
    <Link
      to={to}
      className={`flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-[var(--ph-nav-hover)] sm:px-5 ${d.cardInset}`}
    >
      <span className="min-w-0">
        <span className="block truncate text-[0.875rem] font-medium text-[var(--ph-text)]">{title}</span>
        {subtitle ? <span className={`mt-0.5 block truncate text-[0.75rem] ${d.muted}`}>{subtitle}</span> : null}
      </span>
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
                active ? "ring-2 ring-inset ring-[var(--ph-accent)]" : "hover:scale-110"
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
  bare,
}: {
  d: ProfileDesign;
  value: string;
  onChange: (hex: string) => void;
  presets: ProfileAccentPreset[];
  normalize: (raw: string) => string;
  pipetteLabel?: string;
  /** Без внутренних отступов — когда уже внутри ProfileField */
  bare?: boolean;
}) {
  const norm = normalize(value);
  return (
    <div className={`min-w-0 max-w-full space-y-3 ${bare ? "" : "px-4 py-3"}`}>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 md:grid-cols-8">
        {presets.map((preset) => {
          const active = norm === preset.hex;
          return (
            <button
              key={preset.id}
              type="button"
              title={preset.label}
              onClick={() => onChange(preset.hex)}
              className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl p-2 transition ${
                active ? "ring-2 ring-inset ring-[var(--ph-accent)]" : "hover:bg-[var(--ph-nav-hover)]"
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
      <div className="flex flex-wrap items-center gap-3">
        <label
          className={`relative inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 overflow-hidden pl-1 pr-3 ring-1 ring-[var(--ph-border)] transition hover:bg-[var(--ph-nav-hover)] ${d.rSm}`}
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
        <span className={`shrink-0 font-mono text-[0.75rem] tabular-nums ${d.muted}`}>{norm}</span>
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
      className={`${stretch ? "flex h-9 w-full" : "inline-flex h-9 flex-wrap"} gap-0.5 p-0.5 ${d.inset} ${d.rSm}`}
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
            className={`inline-flex items-center justify-center font-medium leading-none transition ${d.rSm} ${
              stretch ? "h-full min-w-0 flex-1 px-2 text-[0.75rem]" : compact ? "h-full px-2.5 text-[0.6875rem]" : "h-full px-3 text-xs"
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

function PeerCursor({
  className,
  color,
  label,
  isLightBoard,
}: {
  className: string;
  color: string;
  label: string;
  isLightBoard: boolean;
}) {
  return (
    <div className={`pointer-events-none absolute z-20 flex max-w-[4.5rem] flex-col items-start ${className}`} aria-hidden>
      <svg width="14" height="18" viewBox="0 0 14 18" className="shrink-0 drop-shadow-sm">
        <path d="M1 1 L1 14 L5 10 L8 16 L10 15 L7 9 L12 9 Z" fill={color} stroke={isLightBoard ? "#fff" : "#18181b"} strokeWidth="0.75" />
      </svg>
      <span
        className="mt-0.5 max-w-full truncate rounded px-1 py-px text-[0.5625rem] font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        {label}
      </span>
    </div>
  );
}

/** Превью оформления комнаты — только фон/шапка/обои, не аватар. */
export function BoardPreviewPanel({
  d,
  boardBackdrop,
  headerTint,
  cursorStyle,
  wallpaperDataUrl,
  avatarDataUrl,
  wallpaperOpacity = DEFAULT_WALLPAPER_OPACITY,
  compact,
  fill,
  studio,
}: {
  d: ProfileDesign;
  boardBackdrop: string;
  headerTint: string;
  cursorStyle: CursorStyle;
  wallpaperDataUrl: string | null;
  avatarDataUrl: string | null;
  wallpaperOpacity?: number;
  compact?: boolean;
  fill?: boolean;
  /** Рамка «окна» + сетка и курсоры участников */
  studio?: boolean;
}) {
  const { bg: previewBg, header: previewHeader, isLightBoard } = resolveBoardPreviewColors(
    boardBackdrop,
    headerTint,
    avatarDataUrl,
  );
  const wallpaper = effectiveBoardWallpaper({ wallpaperDataUrl, avatarDataUrl });
  const hasWallpaper = !!wallpaper;
  const wallpaperAlpha = wallpaperOpacityFraction(normalizeWallpaperOpacity(wallpaperOpacity));

  const previewClass = fill
    ? "relative min-h-[12rem] w-full flex-1 overflow-hidden rounded-lg md:min-h-0"
    : studio
      ? "relative min-h-[10.5rem] overflow-hidden sm:min-h-[11.5rem]"
      : compact
        ? "relative min-h-[7.5rem] overflow-hidden rounded-lg ring-1 ring-[var(--ph-border)]"
        : "relative min-h-[10rem] overflow-hidden rounded-xl ring-1 ring-[var(--ph-border)] sm:min-h-[11rem]";

  const headerH = fill ? "h-10" : studio ? "h-8" : compact ? "h-7" : "h-9";
  const boardPad = fill ? "gap-2 p-4 pt-12" : studio ? "gap-1.5 p-3 pt-10" : compact ? "gap-1 p-2 pt-8" : "gap-1.5 p-3 pt-11";

  const dotGrid = isLightBoard
    ? "radial-gradient(circle, rgb(0 0 0 / 0.06) 1px, transparent 1px)"
    : "radial-gradient(circle, rgb(255 255 255 / 0.07) 1px, transparent 1px)";

  return (
    <div
      className={`min-w-0 max-w-full overflow-hidden ${fill ? "flex min-h-0 w-full flex-1 flex-col" : "w-full"}`}
      aria-label="Превью доски ретро"
    >
      <div
        className={
          studio
            ? `min-w-0 max-w-full overflow-hidden ${d.rSm} bg-[var(--ph-surface-elevated)] p-2 ring-1 ring-inset ring-[var(--ph-border)]`
            : ""
        }
      >
        {studio ? (
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="flex gap-1" aria-hidden>
              <span className="h-2 w-2 rounded-full bg-red-400/90" />
              <span className="h-2 w-2 rounded-full bg-amber-400/90" />
              <span className="h-2 w-2 rounded-full bg-emerald-400/90" />
            </span>
            <span
              className={`min-w-0 flex-1 truncate rounded-md px-2 py-0.5 text-center font-mono text-[0.625rem] ${d.muted} bg-[var(--ph-surface)] ring-1 ring-[var(--ph-border)]`}
            >
              retrogen.app/r/demo
            </span>
          </div>
        ) : null}
        <div
          className={`${previewClass} max-w-full ${studio ? `${d.rSm} ring-1 ring-black/10 dark:ring-white/10` : ""}`}
          style={{
            background: previewBg,
            cursor: cursorCss(cursorStyle),
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              backgroundImage: dotGrid,
              backgroundSize: "14px 14px",
            }}
            aria-hidden
          />
          {hasWallpaper ? (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `url(${wallpaper})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: wallpaperAlpha,
              }}
              aria-hidden
            />
          ) : null}
          <div
            className={`absolute inset-x-0 top-0 z-10 flex items-center border-b border-black/8 px-2 ${headerH}`}
            style={{ background: previewHeader }}
          >
            {studio ? (
              <span
                className={`truncate text-[0.625rem] font-medium ${
                  isLightBoard ? "text-zinc-600" : "text-zinc-300"
                }`}
              >
                Спринт · Ретро
              </span>
            ) : null}
          </div>
          {studio ? (
            <>
              <PeerCursor
                className="left-[18%] top-[42%]"
                color="#0ea5e9"
                label="А"
                isLightBoard={isLightBoard}
              />
              <PeerCursor
                className="right-[28%] top-[55%]"
                color="#f43f5e"
                label="К"
                isLightBoard={isLightBoard}
              />
            </>
          ) : null}
          <div className={`absolute inset-0 z-[1] flex items-stretch ${boardPad}`}>
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
            className={`absolute bottom-3 right-3 z-10 max-w-[min(7rem,40%)] rounded-lg px-2 py-1.5 text-[0.6875rem] font-medium leading-snug shadow-md ${
              isLightBoard ? "bg-amber-200/95 text-amber-950" : "bg-amber-400/95 text-amber-950"
            }`}
          >
            {studio ? "Идея для Q2" : "Стикер"}
          </div>
        </div>
      </div>
      {!compact && !fill && !studio ? (
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
