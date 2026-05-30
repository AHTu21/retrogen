import { Link } from "react-router-dom";
import type { AuthUserDto } from "../../api";
import type { CloudProfileMeta } from "../../lib/profileCloudPayload";
import type { CloudSyncState } from "../../lib/profileCloudSync";
import type { ProfileDesign } from "./profileDesign";

export function authRoleLabel(globalRole: string): string {
  if (globalRole === "admin") return "Администратор";
  return "Участник";
}

function userMonogram(user: AuthUserDto | null): string {
  if (!user) return "?";
  const name = user.displayName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return user.email.slice(0, 2).toUpperCase();
}

export function SecurityHero({ d, authUser }: { d: ProfileDesign; authUser: AuthUserDto | null }) {
  const signedIn = !!authUser;

  return (
    <div
      className={`relative overflow-hidden ${d.insetGroup} bg-gradient-to-br from-sky-500/10 via-[var(--ph-surface)] to-[var(--ph-surface-elevated)] p-5 sm:p-6 dark:from-sky-950/40`}
    >
      <div className="relative z-[1] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-[0.6875rem] font-semibold uppercase tracking-wide ${d.muted}`}>Система</p>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide ${d.rFull} ${
                signedIn ? d.badgeLive : d.badgeDone
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${signedIn ? "bg-emerald-500" : "bg-zinc-400"}`}
                aria-hidden
              />
              {signedIn ? "Сессия активна" : "Гостевой режим"}
            </span>
          </div>
          <h2 className="mt-1 text-[1.125rem] font-semibold tracking-[-0.02em] text-[var(--ph-text)] sm:text-[1.25rem]">
            Безопасность и доступ
          </h2>
          <p className={`mt-2 text-[0.8125rem] leading-relaxed ${d.muted}`}>
            {signedIn
              ? "Управляйте входом и сессией. Личные данные, блокнот и оформление доски синхронизируются с аккаунтом; аватар и обои — в этом браузере."
              : "Войдите, чтобы привязать профиль к email и синхронизировать настройки между устройствами."}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ring-1 ring-sky-500/25 ${
            d.isLight ? "bg-sky-50" : "bg-sky-950/50"
          }`}
          aria-hidden
        >
          🛡
        </span>
      </div>
    </div>
  );
}

export function SecuritySessionCard({
  d,
  authUser,
  onLogout,
}: {
  d: ProfileDesign;
  authUser: AuthUserDto | null;
  onLogout: () => void;
}) {
  if (!authUser) {
    return (
      <div className={`${d.insetGroup} p-4 sm:p-5`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[0.9375rem] font-semibold text-[var(--ph-text)]">Вы не вошли в аккаунт</p>
            <p className={`mt-1 text-[0.8125rem] leading-relaxed ${d.muted}`}>
              Локальные настройки профиля сохраняются только в этом браузере.
            </p>
          </div>
          <Link to="/login" className={`${d.btnPrimary} w-full justify-center sm:w-auto`}>
            Войти
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${d.insetGroup} overflow-hidden`}>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--ph-nav-active-bg)] text-[0.9375rem] font-semibold text-[var(--ph-accent)] ring-1 ring-[var(--ph-border)]"
            aria-hidden
          >
            {userMonogram(authUser)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.9375rem] font-semibold text-[var(--ph-text)]">
              {authUser.displayName?.trim() || "Без имени"}
            </p>
            <p className={`truncate text-[0.8125rem] ${d.muted}`}>{authUser.email}</p>
            <span
              className={`mt-1.5 inline-flex px-2 py-0.5 text-[0.6875rem] font-medium ${d.rFull} ${
                authUser.globalRole === "admin" ? d.badgeLive : d.badgeDone
              }`}
            >
              {authRoleLabel(authUser.globalRole)}
            </span>
          </div>
        </div>
        <button type="button" className={`${d.btnSecondary} w-full justify-center sm:w-auto`} onClick={onLogout}>
          Выйти из аккаунта
        </button>
      </div>
      <div className={`border-t border-[var(--ph-separator)] px-4 py-2.5 text-[0.75rem] sm:px-5 ${d.muted}`}>
        После выхода локальные заметки и оформление доски останутся в браузере.
      </div>
    </div>
  );
}

type SecurityFeature = {
  id: string;
  icon: string;
  title: string;
  description: string;
  status: "active" | "soon";
};

const SECURITY_FEATURES: SecurityFeature[] = [
  {
    id: "session",
    icon: "🔐",
    title: "Сессия в браузере",
    description: "Токен входа хранится локально; выход завершает сессию на этом устройстве.",
    status: "active",
  },
  {
    id: "local",
    icon: "💾",
    title: "Локальное лобби",
    description: "История и избранное комнат остаются в localStorage; полный снимок — JSON-бэкап.",
    status: "active",
  },
  {
    id: "cloud",
    icon: "☁",
    title: "Облачный профиль",
    description: "Аватар и обои загружаются на сервер; между устройствами — через API media.",
    status: "active",
  },
  {
    id: "password",
    icon: "🔑",
    title: "Смена пароля",
    description: "Self-service через email — в корпоративных тарифах.",
    status: "soon",
  },
  {
    id: "2fa",
    icon: "📱",
    title: "Двухфакторная аутентификация",
    description: "Дополнительный код при входе для команд с повышенными требованиями.",
    status: "soon",
  },
];

export function SecurityCloudSyncCard({
  d,
  authUser,
  label,
  state,
  meta,
  onRetry,
}: {
  d: ProfileDesign;
  authUser: AuthUserDto | null;
  label?: string | null;
  state?: CloudSyncState;
  meta?: CloudProfileMeta;
  onRetry?: () => void;
}) {
  if (!authUser) return null;

  const synced = state?.kind === "synced" || meta?.lastPushedAt || meta?.serverUpdatedAt;
  const errored = state?.kind === "error";

  return (
    <section className="space-y-2">
      <div className="px-0.5">
        <h2 className={d.groupTitle}>Облачная синхронизация</h2>
        <p className={d.groupDesc}>Настройки профиля на сервере — подтягиваются при входе на новом устройстве</p>
      </div>
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${d.insetGroup} p-4 sm:p-5`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[0.9375rem] font-semibold text-[var(--ph-text)]">
              {label ?? (synced ? "Синхронизировано" : "Ожидание")}
            </p>
            <span
              className={`px-2 py-0.5 text-[0.625rem] font-semibold uppercase ${d.rFull} ${
                errored
                  ? "bg-red-500/12 text-red-700 dark:text-red-300"
                  : synced
                    ? d.badgeLive
                    : d.badgePreview
              }`}
            >
              {errored ? "Ошибка" : synced ? "Активно" : "Синхронизация"}
            </span>
          </div>
          <p className={`mt-1 max-w-md text-[0.8125rem] leading-relaxed ${d.muted}`}>
            В облаке: имя, контакты, блокнот, тема комнаты, уведомления; аватар и обои — через загрузку на сервер. Локально: история лобби в JSON-бэкапе.
            {meta?.serverUpdatedAt ? ` Последнее обновление на сервере: ${formatCloudDate(meta.serverUpdatedAt)}.` : null}
          </p>
        </div>
        {errored && onRetry ? (
          <button type="button" className={`${d.btnSecondary} shrink-0`} onClick={onRetry}>
            Повторить
          </button>
        ) : null}
      </div>
    </section>
  );
}

function formatCloudDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function SecurityDataPortability({
  d,
  onExport,
  onImport,
}: {
  d: ProfileDesign;
  onExport: () => void;
  onImport: (file: File | undefined) => void;
}) {
  return (
    <section className="space-y-2">
      <div className="px-0.5">
        <h2 className={d.groupTitle}>Резервная копия настроек</h2>
        <p className={d.groupDesc}>
          Экспорт JSON — полная копия включая аватар и лобби; облако — текстовые настройки профиля без data URL
        </p>
      </div>
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${d.insetGroup} p-4 sm:p-5`}>
        <p className={`max-w-md text-[0.8125rem] leading-relaxed ${d.muted}`}>
          Скачайте файл перед сменой устройства или для внутреннего регламента. Импорт полностью заменяет локальные
          настройки.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={d.btnPrimary} onClick={onExport}>
            Скачать .json
          </button>
          <label className={`inline-flex cursor-pointer ${d.btnSecondary}`}>
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                onImport(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            Импортировать
          </label>
        </div>
      </div>
    </section>
  );
}

export function SecurityFeaturesGrid({ d, authUser }: { d: ProfileDesign; authUser: AuthUserDto | null }) {
  const features = authUser
    ? SECURITY_FEATURES
    : SECURITY_FEATURES.filter((f) => f.id === "local" || f.id === "session");

  return (
    <section className="space-y-2">
      <div className="px-0.5">
        <h2 className={d.groupTitle}>Защита аккаунта</h2>
        <p className={d.groupDesc}>Что уже работает и что появится в корпоративных тарифах</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {features.map((feature) => (
          <div
            key={feature.id}
            className={`flex min-w-0 gap-3 ${d.insetGroup} p-3.5 sm:p-4 ${
              feature.status === "soon" ? "opacity-90" : ""
            }`}
          >
            <span className="text-lg leading-none" aria-hidden>
              {feature.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[0.8125rem] font-semibold text-[var(--ph-text)]">{feature.title}</p>
                <span
                  className={`px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide ${d.rFull} ${
                    feature.status === "active" ? d.badgeLive : d.badgeDone
                  }`}
                >
                  {feature.status === "active" ? "Активно" : "Скоро"}
                </span>
              </div>
              <p className={`mt-1 text-[0.75rem] leading-relaxed ${d.muted}`}>{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SecurityPrivacyNote({ d }: { d: ProfileDesign }) {
  return (
    <div className={`${d.noticeInfo} px-4 py-3 text-[0.8125rem] leading-relaxed ${d.rSm}`}>
      <p className="font-medium">Конфиденциальность</p>
      <p className="mt-1 opacity-90">
        Мы не показываем ваш блокнот и личные заметки другим участникам. Данные комнат регулируются правами доступа к
        сессии.
      </p>
    </div>
  );
}

export type DangerAction = {
  id: string;
  icon: string;
  title: string;
  description: string;
  consequences: string[];
  buttonLabel: string;
  corporateOnly?: boolean;
};

export const DANGER_ACTIONS: DangerAction[] = [
  {
    id: "export",
    icon: "📦",
    title: "Полный GDPR-архив",
    description: "Расширенная выгрузка активности по запросу GDPR или внутреннему регламенту (не путать с JSON в «Безопасность»).",
    consequences: ["Формат JSON или архив по email", "Обработка командой поддержки", "Срок — до 30 рабочих дней"],
    buttonLabel: "Запросить",
    corporateOnly: true,
  },
  {
    id: "delete",
    icon: "🗑",
    title: "Удаление аккаунта",
    description: "Полное удаление учётной записи и отзыв доступов ко всем комнатам организации.",
    consequences: ["Необратимо после подтверждения", "Комнаты останутся у организации", "Требуется проверка личности"],
    buttonLabel: "Удалить",
    corporateOnly: true,
  },
];

export function DangerHero({ d }: { d: ProfileDesign }) {
  return (
    <div
      className={`relative overflow-hidden ${d.insetGroup} border-red-500/25 bg-gradient-to-br from-red-500/10 via-[var(--ph-surface)] to-[var(--ph-surface-elevated)] p-5 sm:p-6 dark:from-red-950/35`}
    >
      <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-xl">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
            Требует внимания
          </p>
          <h2 className="mt-1 text-[1.125rem] font-semibold tracking-[-0.02em] text-[var(--ph-text)] sm:text-[1.25rem]">
            Опасная зона
          </h2>
          <p className={`mt-2 text-[0.8125rem] leading-relaxed ${d.muted}`}>
            Экспорт и удаление необратимы или затрагивают все ваши доступы. Действуйте только если понимаете последствия.
          </p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ring-1 ring-red-500/30 ${
            d.isLight ? "bg-red-50" : "bg-red-950/50"
          }`}
          aria-hidden
        >
          ⚠
        </span>
      </div>
    </div>
  );
}

export function DangerActionCard({ d, action }: { d: ProfileDesign; action: DangerAction }) {
  return (
    <article
      className={`min-w-0 overflow-hidden ${d.insetGroup} ring-1 ring-red-500/15 dark:ring-red-500/25`}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 gap-3">
          <span className="text-xl leading-none" aria-hidden>
            {action.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[0.9375rem] font-semibold text-[var(--ph-text)]">{action.title}</h3>
              {action.corporateOnly ? (
                <span className={`px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide ${d.rFull} ${d.badgeDone}`}>
                  Корп. тариф
                </span>
              ) : null}
            </div>
            <p className={`mt-1 text-[0.8125rem] leading-relaxed ${d.muted}`}>{action.description}</p>
            <ul className={`mt-3 space-y-1.5 text-[0.75rem] leading-relaxed ${d.muted}`}>
              {action.consequences.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="shrink-0 text-red-500/80" aria-hidden>
                    •
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Доступно в корпоративных тарифах"
          className={`${d.btnAction} shrink-0 cursor-not-allowed border-red-500/20 opacity-50`}
        >
          {action.buttonLabel}
        </button>
      </div>
    </article>
  );
}

export function DangerSupportStrip({ d }: { d: ProfileDesign }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${d.insetGroup} p-4 sm:p-5`}>
      <div className="min-w-0">
        <p className="text-[0.8125rem] font-semibold text-[var(--ph-text)]">Нужна помощь?</p>
        <p className={`mt-0.5 text-[0.75rem] leading-relaxed ${d.muted}`}>
          По экспорту и удалению обратитесь в поддержку — подскажем процесс для вашей организации.
        </p>
      </div>
      <Link to="/messages" className={`${d.btnSecondary} w-full justify-center sm:w-auto`}>
        Написать в поддержку
      </Link>
    </div>
  );
}
