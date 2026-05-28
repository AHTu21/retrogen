import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  getFavoriteSlugs,
  getVisitedRooms,
  toggleFavoriteSlug,
  type VisitedRoomEntry,
} from "../../lib/roomLobbyPrefs";
import type { ProfileDesign } from "./profileDesign";

export type LobbyRoomView = VisitedRoomEntry & { isFavorite?: boolean };

export function roomInitial(theme: string, slug: string): string {
  const t = (theme || slug).trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

export function roomAccentHue(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function roomStatusMeta(status: string): { label: string; live: boolean } {
  if (status === "ended") return { label: "Завершено", live: false };
  if (status && status !== "unknown") return { label: "В эфире", live: true };
  return { label: "Без статуса", live: false };
}

export function formatVisitedRelative(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfVisit = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayDiff = Math.round((startOfToday.getTime() - startOfVisit.getTime()) / 86400000);
    const time = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(d);
    if (dayDiff === 0) return `Сегодня, ${time}`;
    if (dayDiff === 1) return `Вчера, ${time}`;
    if (dayDiff < 7) return `${dayDiff} дн. назад`;
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(d);
  } catch {
    return "";
  }
}

type VisitGroup = { id: string; title: string; items: VisitedRoomEntry[] };

export function groupVisitedByRecency(entries: VisitedRoomEntry[]): VisitGroup[] {
  const today: VisitedRoomEntry[] = [];
  const yesterday: VisitedRoomEntry[] = [];
  const week: VisitedRoomEntry[] = [];
  const earlier: VisitedRoomEntry[] = [];
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  for (const e of entries) {
    if (!e.lastVisitedAt) {
      earlier.push(e);
      continue;
    }
    const d = new Date(e.lastVisitedAt);
    const startVisit = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diff = Math.round((startToday - startVisit) / 86400000);
    if (diff === 0) today.push(e);
    else if (diff === 1) yesterday.push(e);
    else if (diff < 7) week.push(e);
    else earlier.push(e);
  }

  const groups: VisitGroup[] = [];
  if (today.length) groups.push({ id: "today", title: "Сегодня", items: today });
  if (yesterday.length) groups.push({ id: "yesterday", title: "Вчера", items: yesterday });
  if (week.length) groups.push({ id: "week", title: "На этой неделе", items: week });
  if (earlier.length) groups.push({ id: "earlier", title: "Ранее", items: earlier });
  return groups;
}

export function LobbyHubHero({ d }: { d: ProfileDesign }) {
  return (
    <div
      className={`relative overflow-hidden ${d.insetGroup} bg-gradient-to-br from-[var(--ph-nav-active-bg)] via-[var(--ph-surface)] to-[var(--ph-surface-elevated)] p-5 sm:p-6`}
    >
      <div className="relative z-[1] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 max-w-xl">
          <p className={`text-[0.6875rem] font-semibold uppercase tracking-wide ${d.muted}`}>Центр комнат</p>
          <h2 className="mt-1 text-[1.125rem] font-semibold tracking-[-0.02em] text-[var(--ph-text)] sm:text-[1.25rem]">
            Лобби Retrogen
          </h2>
          <p className={`mt-2 text-[0.8125rem] leading-relaxed ${d.muted}`}>
            Создавайте ретро, возвращайтесь к избранным комнатам и следите за сессиями в эфире. Данные хранятся в этом
            браузере.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link to="/home" className={`${d.btnPrimary} w-full justify-center sm:w-auto`}>
            Открыть лобби
          </Link>
          <Link to="/workshop" className={`${d.btnSecondary} w-full justify-center sm:w-auto`}>
            Мастерская шаблонов
          </Link>
        </div>
      </div>
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--ph-accent)] opacity-20 blur-2xl"
        aria-hidden
      />
    </div>
  );
}

export function LobbyInsightStrip({
  d,
  visitedCount,
  favoriteCount,
  liveCount,
}: {
  d: ProfileDesign;
  visitedCount: number;
  favoriteCount: number;
  liveCount: number;
}) {
  const items = [
    { label: "В истории", value: visitedCount, hint: "посещённые комнаты" },
    { label: "Избранное", value: favoriteCount, hint: "быстрый доступ" },
    { label: "В эфире", value: liveCount, hint: "из недавних" },
  ];

  return (
    <div className={`grid gap-2 sm:grid-cols-3 ${d.insetGroup} p-2.5 sm:p-3`}>
      {items.map((item) => (
        <div
          key={item.label}
          className={`min-w-0 rounded-lg bg-[var(--ph-surface-elevated)] px-3 py-2.5 ring-1 ring-[var(--ph-border)] ${d.rSm}`}
        >
          <p className={`text-[0.6875rem] font-medium ${d.muted}`}>{item.label}</p>
          <p className="mt-0.5 text-[1.375rem] font-semibold tabular-nums tracking-[-0.02em] text-[var(--ph-text)]">
            {item.value}
          </p>
          <p className={`mt-0.5 text-[0.625rem] ${d.muted}`}>{item.hint}</p>
        </div>
      ))}
    </div>
  );
}

function RoomAvatar({ slug, theme }: { slug: string; theme: string }) {
  const hue = roomAccentHue(slug);
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[0.8125rem] font-semibold text-white shadow-sm ring-1 ring-black/10"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 55% 48%), hsl(${(hue + 40) % 360} 50% 38%))` }}
      aria-hidden
    >
      {roomInitial(theme, slug)}
    </span>
  );
}

export function LobbyFavoriteCard({
  d,
  room,
  onFavoriteChange,
}: {
  d: ProfileDesign;
  room: LobbyRoomView;
  onFavoriteChange: () => void;
}) {
  const status = roomStatusMeta(room.status);
  const hue = roomAccentHue(room.slug);

  return (
    <div
      className={`group relative flex min-w-0 flex-col gap-3 ${d.rSm} bg-[var(--ph-surface-elevated)] p-3 ring-1 ring-[var(--ph-border)] transition hover:ring-[var(--ph-accent)]/35`}
    >
      <div className="flex items-start gap-3">
        <RoomAvatar slug={room.slug} theme={room.themeSanitized} />
        <div className="min-w-0 flex-1">
          <Link to={`/r/${room.slug}`} className="block truncate text-[0.875rem] font-semibold text-[var(--ph-text)] hover:text-[var(--ph-accent)]">
            {room.themeSanitized || room.slug}
          </Link>
          <p className={`mt-0.5 truncate font-mono text-[0.6875rem] ${d.muted}`}>/r/{room.slug}</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 text-amber-500 transition hover:bg-amber-500/10"
          title="Убрать из избранного"
          onClick={() => {
            toggleFavoriteSlug(room.slug);
            onFavoriteChange();
          }}
        >
          <span className="text-base leading-none" aria-hidden>
            ★
          </span>
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={`px-2 py-0.5 text-[0.6875rem] font-medium ${d.rFull} ${status.live ? d.badgeLive : d.badgeDone}`}>
          {status.label}
        </span>
        <Link
          to={`/r/${room.slug}`}
          className={`text-[0.75rem] font-medium text-[var(--ph-link)] opacity-0 transition group-hover:opacity-100 focus:opacity-100`}
        >
          Войти →
        </Link>
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 opacity-60"
        style={{ background: `linear-gradient(90deg, hsl(${hue} 60% 50%), transparent)` }}
        aria-hidden
      />
    </div>
  );
}

export function LobbySessionRow({ d, room }: { d: ProfileDesign; room: VisitedRoomEntry }) {
  const status = roomStatusMeta(room.status);
  const when = formatVisitedRelative(room.lastVisitedAt);
  const fav = getFavoriteSlugs().includes(room.slug);

  return (
    <Link
      to={`/r/${room.slug}`}
      className={`flex min-w-0 items-center gap-3 px-4 py-3 transition hover:bg-[var(--ph-nav-hover)] sm:px-5 sm:py-3.5`}
    >
      <RoomAvatar slug={room.slug} theme={room.themeSanitized} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.875rem] font-medium text-[var(--ph-text)]">{room.themeSanitized || room.slug}</p>
        <p className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.75rem] ${d.muted}`}>
          {when ? <span>{when}</span> : null}
          <span className="font-mono text-[0.6875rem] opacity-80">/r/{room.slug}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {fav ? (
          <span className="text-amber-500" title="В избранном" aria-hidden>
            ★
          </span>
        ) : null}
        <span className={`px-2 py-0.5 text-[0.6875rem] font-medium ${d.rFull} ${status.live ? d.badgeLive : d.badgeDone}`}>
          {status.label}
        </span>
        <svg className={`h-4 w-4 ${d.muted}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </Link>
  );
}

export function LobbyEmptyState({
  d,
  icon,
  title,
  children,
  action,
}: {
  d: ProfileDesign;
  icon: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center sm:px-6 sm:py-12">
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ring-1 ring-[var(--ph-border)] ${d.inset}`}
        aria-hidden
      >
        {icon}
      </span>
      <p className="mt-4 text-[0.9375rem] font-medium text-[var(--ph-text)]">{title}</p>
      <p className={`mt-2 max-w-sm text-[0.8125rem] leading-relaxed ${d.muted}`}>{children}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function LobbyFavoritesSection({
  d,
  favorites,
  onFavoriteChange,
}: {
  d: ProfileDesign;
  favorites: LobbyRoomView[];
  onFavoriteChange: () => void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
        <div>
          <h2 className={d.groupTitle}>Избранное</h2>
          <p className={d.groupDesc}>Комнаты со звёздочкой — открываются в один клик</p>
        </div>
        {favorites.length > 0 ? (
          <Link to="/home" className={`text-[0.75rem] font-medium ${d.link}`}>
            Управлять в лобби
          </Link>
        ) : null}
      </div>
      <div className={d.insetGroup}>
        {favorites.length ? (
          <div className="grid gap-2 p-2.5 sm:grid-cols-2 sm:p-3">
            {favorites.map((room) => (
              <LobbyFavoriteCard key={room.slug} d={d} room={room} onFavoriteChange={onFavoriteChange} />
            ))}
          </div>
        ) : (
          <LobbyEmptyState
            d={d}
            icon="★"
            title="Пока нет избранных"
            action={
              <Link to="/home" className={d.btnPrimary}>
                Перейти в лобби
              </Link>
            }
          >
            Отметьте комнату звёздочкой на главной — она появится здесь для быстрого доступа.
          </LobbyEmptyState>
        )}
      </div>
    </section>
  );
}

export function LobbyRecentSection({
  d,
  recent,
}: {
  d: ProfileDesign;
  recent: VisitedRoomEntry[];
}) {
  const groups = useMemo(() => groupVisitedByRecency(recent), [recent]);
  const showMore = getVisitedRooms().length > recent.length;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
        <div>
          <h2 className={d.groupTitle}>Недавние сессии</h2>
          <p className={d.groupDesc}>Сгруппированы по дате последнего визита</p>
        </div>
        {recent.length > 0 && showMore ? (
          <Link to="/home" className={`text-[0.75rem] font-medium ${d.link}`}>
            Вся история ({getVisitedRooms().length})
          </Link>
        ) : null}
      </div>
      <div className={`${d.insetGroup} divide-y ${d.divider}`}>
        {recent.length ? (
          groups.map((group) => (
            <div key={group.id}>
              <p
                className={`sticky top-0 z-[1] border-b border-[var(--ph-separator)] bg-[var(--ph-surface)]/95 px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-wide backdrop-blur-sm ${d.muted} sm:px-5`}
              >
                {group.title}
              </p>
              <div className={`divide-y ${d.divider}`}>
                {group.items.map((room) => (
                  <LobbySessionRow key={room.slug} d={d} room={room} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <LobbyEmptyState
            d={d}
            icon="🕐"
            title="История пуста"
            action={
              <Link to="/home" className={d.btnPrimary}>
                Создать или открыть комнату
              </Link>
            }
          >
            Зайдите в ретро по ссылке или из лобби — посещения сохранятся автоматически в этом браузере.
          </LobbyEmptyState>
        )}
      </div>
    </section>
  );
}

/** Собирает избранное с метаданными из истории */
export function useLobbyRoomLists(listRevision: number) {
  return useMemo(() => {
    void listRevision;
    const favoriteSlugs = getFavoriteSlugs();
    const visitedBySlug = new Map(getVisitedRooms().map((v) => [v.slug, v]));
    const favorites: LobbyRoomView[] = favoriteSlugs
      .map((slug) => {
        const v = visitedBySlug.get(slug);
        return v
          ? { ...v, isFavorite: true }
          : { slug, themeSanitized: slug, status: "unknown", lastVisitedAt: "", isFavorite: true };
      })
      .slice(0, 12);
    const recent = getVisitedRooms().slice(0, 14);
    const liveCount = getVisitedRooms().filter((v) => v.status !== "ended").length;
    return { favorites, recent, liveCount };
  }, [listRevision]);
}
