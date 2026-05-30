import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { AuthUserDto } from "../../api";
import {
  buildProfileCompletionTasks,
  profileCompletionPercent,
  type ProfileCompletionTask,
} from "../../lib/profileCompletion";
import {
  resolveProfileNotificationEmail,
} from "../../lib/profileNotificationPrefs";
import type { UserProfilePrefs } from "../../lib/profilePrefs";
import { effectiveBoardWallpaper } from "../../lib/profilePrefs";
import type { VisitedRoomEntry } from "../../lib/roomLobbyPrefs";
import type { ProfileDesign } from "./profileDesign";
import type { ProfileSectionId } from "./profileHubTheme";
import { PROFILE_NAV } from "./profileHubTheme";
import { LobbySessionRow } from "./profileLobbyUi";
import { profileNavIcon } from "./profileNavIcons";
import { displayNameWithStatus, initials } from "./profileUser";

function greetingByHour(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Доброе утро";
  if (h >= 12 && h < 18) return "Добрый день";
  if (h >= 18 && h < 23) return "Добрый вечер";
  return "Доброй ночи";
}

type ProfileTask = ProfileCompletionTask;

export function buildProfileTasks(prefs: UserProfilePrefs, authUser: AuthUserDto | null): ProfileTask[] {
  return buildProfileCompletionTasks(prefs, authUser);
}

export function OverviewWelcomeHero({
  d,
  prefs,
  authUser,
}: {
  d: ProfileDesign;
  prefs: UserProfilePrefs;
  authUser: AuthUserDto | null;
}) {
  const name = displayNameWithStatus(prefs, authUser);
  const roleLine = [prefs.roleTitle.trim(), prefs.teamName.trim()].filter(Boolean).join(" · ");
  const signedIn = !!authUser;

  return (
    <div
      className={`relative overflow-hidden ${d.insetGroup} bg-gradient-to-br from-[var(--ph-nav-active-bg)] via-[var(--ph-surface)] to-[var(--ph-surface-elevated)] p-5 sm:p-6`}
    >
      <div className="relative z-[1] flex items-start gap-4">
        <div
          className={`flex h-[5.25rem] w-[5.25rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--ph-surface-elevated)] text-xl font-semibold text-[var(--ph-muted)] ring-1 ring-[var(--ph-border)] sm:h-[5.5rem] sm:w-[5.5rem]`}
        >
          {prefs.avatarDataUrl ? (
            <img src={prefs.avatarDataUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(prefs, authUser)
          )}
        </div>
        <div className="flex h-[5.25rem] min-w-0 flex-1 flex-col sm:h-[5.5rem]">
          <p className={`shrink-0 text-[0.8125rem] font-semibold uppercase tracking-wide ${d.muted}`}>
            {greetingByHour()}
          </p>
          <div className="flex min-h-0 flex-1 flex-col justify-center -translate-y-[2px]">
            <h2 className="truncate text-[1.25rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--ph-text)] sm:text-[1.375rem]">
              {name}
            </h2>
            {roleLine ? <p className={`mt-0.5 truncate text-[0.8125rem] leading-snug ${d.muted}`}>{roleLine}</p> : null}
          </div>
          <p className={`shrink-0 truncate text-[0.75rem] leading-snug ${d.muted}`}>
            {signedIn ? authUser.email : "Гостевой режим — войдите, чтобы привязать профиль к аккаунту"}
          </p>
        </div>
      </div>
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[var(--ph-accent)] opacity-15 blur-2xl"
        aria-hidden
      />
    </div>
  );
}

export type OverviewHubItem = {
  id: string;
  label: string;
  /** Крупное значение-сводка */
  value: ReactNode;
  /** Подпись под значением */
  metric: string;
  /** Действие при переходе */
  action: string;
  icon: ReactNode;
  primary?: boolean;
  href?: string;
  section?: ProfileSectionId;
};

export function buildOverviewHubItems(
  prefs: UserProfilePrefs,
  authUser: AuthUserDto | null,
  visitedCount: number,
  favoriteCount: number,
): OverviewHubItem[] {
  const boardValue = effectiveBoardWallpaper(prefs)
    ? "С обоями"
    : prefs.boardBackdrop.trim()
      ? "Свой фон"
      : "По умолчанию";
  const notepadWords = prefs.notepad.trim().split(/\s+/).filter(Boolean).length;
  const notepadValue = notepadWords ? `${notepadWords} слов` : "Пусто";
  const notifyEmail = resolveProfileNotificationEmail(prefs.profileEmail, authUser?.email ?? undefined);
  const notifyOn = [
    prefs.notifications.retroEnded,
    prefs.notifications.weeklyDigest,
    prefs.notifications.productUpdates,
  ].filter(Boolean).length;
  const notifyValue = authUser && notifyEmail ? `${notifyOn} вкл.` : authUser ? "Нет email" : "После входа";
  const tasks = buildProfileCompletionTasks(prefs, authUser);
  const profilePct = profileCompletionPercent(tasks);
  const roomsWord = visitedCount === 1 ? "комната" : visitedCount < 5 ? "комнаты" : "комнат";
  const favWord = favoriteCount === 1 ? "звезда" : favoriteCount < 5 ? "звезды" : "звёздочек";

  return [
    {
      id: "home",
      label: "Лобби",
      value: visitedCount,
      metric: `${roomsWord} в истории`,
      action: "Создать или открыть",
      icon: profileNavIcon("lobby"),
      primary: true,
      href: "/home",
    },
    {
      id: "lobby",
      label: "Комнаты",
      value: favoriteCount,
      metric: `${favWord} в избранном`,
      action: "История и недавние",
      icon: profileNavIcon("lobby"),
      section: "lobby",
    },
    {
      id: "identity",
      label: "Личные данные",
      value: `${profilePct}%`,
      metric: "профиль заполнен",
      action: "Имя, роль, контакты",
      icon: profileNavIcon("identity"),
      section: "identity",
    },
    {
      id: "room",
      label: "Доска",
      value: boardValue,
      metric: "оформление комнаты",
      action: "Темы и цвета",
      icon: profileNavIcon("room"),
      section: "room",
    },
    {
      id: "notepad",
      label: "Блокнот",
      value: notepadValue,
      metric: "личные заметки",
      action: "План сессии",
      icon: profileNavIcon("notepad"),
      section: "notepad",
    },
    {
      id: "notifications",
      label: "Уведомления",
      value: notifyValue,
      metric: "email-рассылка",
      action: "Завершение ретро и дайджест",
      icon: profileNavIcon("notifications"),
      section: "notifications",
    },
    {
      id: "workshop",
      label: "Мастерская",
      value: "Шаблоны",
      metric: "готовые сценарии",
      action: "Открыть каталог",
      icon: (
        <span className="text-base leading-none" aria-hidden>
          🧩
        </span>
      ),
      href: "/workshop",
    },
  ];
}

function OverviewHubTile({
  d,
  item,
  onGoSection,
}: {
  d: ProfileDesign;
  item: OverviewHubItem;
  onGoSection: (id: ProfileSectionId) => void;
}) {
  const inner = (
    <>
      <span className="text-[var(--ph-accent)]">{item.icon}</span>
      <p className={`mt-2 text-[0.6875rem] font-medium ${d.muted}`}>{item.label}</p>
      <p className="mt-0.5 truncate text-[1.125rem] font-semibold tabular-nums tracking-[-0.02em] text-[var(--ph-text)]">
        {item.value}
      </p>
      <p className={`mt-0.5 truncate text-[0.625rem] ${d.muted}`}>{item.metric}</p>
      <p className={`mt-1.5 text-[0.6875rem] font-medium text-[var(--ph-link)]`}>{item.action} →</p>
    </>
  );

  const className = `flex min-w-0 flex-col items-start p-3 text-left transition ${d.rSm} ring-1 ${
    item.primary
      ? "bg-[var(--ph-nav-active-bg)] ring-[var(--ph-accent)]/40 hover:ring-[var(--ph-accent)]"
      : "bg-[var(--ph-surface-elevated)] ring-[var(--ph-border)] hover:bg-[var(--ph-nav-hover)] hover:ring-[var(--ph-accent)]/25"
  }`;

  if (item.href) {
    return (
      <Link key={item.id} to={item.href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      key={item.id}
      type="button"
      className={className}
      onClick={() => item.section && onGoSection(item.section)}
    >
      {inner}
    </button>
  );
}

/** Сводка + переход в разделах — одна сетка плиток */
export function OverviewHub({
  d,
  items,
  onGoSection,
}: {
  d: ProfileDesign;
  items: OverviewHubItem[];
  onGoSection: (id: ProfileSectionId) => void;
}) {
  return (
    <section className="space-y-2">
      <div className="px-0.5">
        <h2 className={d.groupTitle}>Разделы и сводка</h2>
        <p className={d.groupDesc}>Цифра на плитке — состояние, стрелка — переход в раздел</p>
      </div>
      <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${d.insetGroup} p-2.5 sm:p-3`}>
        {items.map((item) => (
          <OverviewHubTile key={item.id} d={d} item={item} onGoSection={onGoSection} />
        ))}
      </div>
    </section>
  );
}

const PROFILE_PROGRESS_COLLAPSED_KEY = "retrogen_profile_progress_collapsed_v1";

function readProfileProgressCollapsed(): boolean {
  try {
    return localStorage.getItem(PROFILE_PROGRESS_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeProfileProgressCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(PROFILE_PROGRESS_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function OverviewProfileProgress({
  d,
  tasks,
  onGoSection,
}: {
  d: ProfileDesign;
  tasks: ProfileTask[];
  onGoSection: (id: ProfileSectionId) => void;
}) {
  const done = tasks.filter((t) => t.done).length;
  const pct = Math.round((done / tasks.length) * 100);
  const [collapsed, setCollapsed] = useState(readProfileProgressCollapsed);

  useEffect(() => {
    if (pct === 100) {
      setCollapsed(true);
      writeProfileProgressCollapsed(true);
    }
  }, [pct]);

  const collapse = () => {
    setCollapsed(true);
    writeProfileProgressCollapsed(true);
  };

  const expand = () => {
    setCollapsed(false);
    writeProfileProgressCollapsed(false);
  };

  if (collapsed && pct === 100) {
    return null;
  }

  if (collapsed) {
    return (
      <section className="px-0.5">
        <button
          type="button"
          onClick={expand}
          className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left ring-1 ring-[var(--ph-border)] transition hover:bg-[var(--ph-nav-hover)] ${d.rSm} bg-[var(--ph-surface)]`}
        >
          <span className="text-[0.8125rem] font-medium text-[var(--ph-text)]">Заполнение профиля</span>
          <span className={`shrink-0 text-[0.75rem] font-medium tabular-nums ${d.link}`}>{pct}% · показать</span>
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
        <div className="min-w-0 flex-1">
          <h2 className={d.groupTitle}>Заполнение профиля</h2>
          <p className={d.groupDesc}>Подсказки — что улучшить до следующего ретро</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`text-[0.8125rem] font-semibold tabular-nums ${pct === 100 ? "text-emerald-600 dark:text-emerald-400" : d.muted}`}
          >
            {pct}%
          </span>
          <button type="button" className={`text-[0.75rem] font-medium ${d.link}`} onClick={collapse}>
            Скрыть
          </button>
        </div>
      </div>
      <div className={`${d.insetGroup} overflow-hidden`}>
        <div className="h-1.5 bg-[var(--ph-surface-elevated)]">
          <div
            className={`h-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-[var(--ph-accent)]"}`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <ul className={`divide-y ${d.divider}`}>
          {tasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => onGoSection(task.section)}
                className="flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--ph-nav-hover)] sm:px-5"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.75rem] ${
                    task.done
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-[var(--ph-surface-elevated)] ring-1 ring-[var(--ph-border)] text-[var(--ph-muted)]"
                  }`}
                  aria-hidden
                >
                  {task.done ? "✓" : "·"}
                </span>
                <span className={`min-w-0 flex-1 text-[0.8125rem] ${task.done ? d.muted : "font-medium text-[var(--ph-text)]"}`}>
                  {task.label}
                </span>
                {!task.done ? (
                  <span className={`shrink-0 text-[0.75rem] font-medium ${d.link}`}>Заполнить</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function OverviewRecentSessions({
  d,
  visited,
  onGoSection,
}: {
  d: ProfileDesign;
  visited: VisitedRoomEntry[];
  onGoSection: (id: ProfileSectionId) => void;
}) {
  const recent = visited.slice(0, 5);
  const lobbyMeta = PROFILE_NAV.find((n) => n.id === "lobby");

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
        <div>
          <h2 className={d.groupTitle}>Недавние сессии</h2>
          <p className={d.groupDesc}>Последние комнаты в этом браузере</p>
        </div>
        {recent.length > 0 ? (
          <button type="button" className={`text-[0.75rem] font-medium ${d.link}`} onClick={() => onGoSection("lobby")}>
            {lobbyMeta?.label ?? "Все комнаты"} →
          </button>
        ) : null}
      </div>
      <div className={`min-w-0 ${d.insetGroup} divide-y ${d.divider}`}>
        {recent.length ? (
          recent.map((room) => <LobbySessionRow key={room.slug} d={d} room={room} />)
        ) : (
          <div className="flex flex-col items-center px-4 py-10 text-center sm:px-6">
            <span className="text-2xl" aria-hidden>
              🏠
            </span>
            <p className="mt-3 text-[0.9375rem] font-medium text-[var(--ph-text)]">Пока нет посещений</p>
            <p className={`mt-1 max-w-xs text-[0.8125rem] leading-relaxed ${d.muted}`}>
              Создайте или откройте комнату в лобби — она появится здесь автоматически.
            </p>
            <Link to="/home" className={`${d.btnPrimary} mt-4`}>
              Открыть лобби
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
