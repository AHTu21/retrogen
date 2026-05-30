import { Link } from "react-router-dom";
import type { AuthUserDto } from "../../../api";
import type { UserProfilePrefs } from "../../../lib/profilePrefs";
import {
  resolveProfileNotificationEmail,
  type ProfileEmailNotifications,
} from "../../../lib/profileNotificationPrefs";
import type { ProfileDesign } from "../profileDesign";
import type { ProfileSectionId } from "../profileHubTheme";
import { ProfileCard, ProfileSectionFrame, ProfileToggleRow } from "../profileUi";

type Props = {
  d: ProfileDesign;
  prefs: UserProfilePrefs;
  setPrefs: React.Dispatch<React.SetStateAction<UserProfilePrefs>>;
  authUser: AuthUserDto | null;
  onGoSection: (id: ProfileSectionId) => void;
};

function patchNotifications(
  prefs: UserProfilePrefs,
  patch: Partial<ProfileEmailNotifications>,
): UserProfilePrefs {
  return {
    ...prefs,
    notifications: { ...prefs.notifications, ...patch },
  };
}

function NotificationsHero({
  d,
  email,
  signedIn,
  onGoSection,
}: {
  d: ProfileDesign;
  email: string;
  signedIn: boolean;
  onGoSection: (id: ProfileSectionId) => void;
}) {
  const headline = signedIn
    ? email
      ? "Письма на ваш email"
      : "Добавьте email"
    : "После входа";

  return (
    <div
      className={`relative overflow-hidden ${d.insetGroup} bg-gradient-to-br from-sky-500/10 via-[var(--ph-surface)] to-[var(--ph-surface-elevated)] p-5 sm:p-6 dark:from-sky-950/40`}
    >
      <div className="relative z-[1] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-[0.6875rem] font-semibold uppercase tracking-wide ${d.muted}`}>Система</p>
            {signedIn && email ? (
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide ${d.rFull} ${d.badgeLive}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                Email указан
              </span>
            ) : null}
          </div>
          <h2 className="mt-1 text-[1.125rem] font-semibold tracking-[-0.02em] text-[var(--ph-text)] sm:text-[1.25rem]">
            {headline}
          </h2>
          <p className={`mt-2 text-[0.8125rem] leading-relaxed ${d.muted}`}>
            {signedIn
              ? email
                ? <>Адрес доставки: {email}.</>
                : "Укажите email в аккаунте или в поле «Email в карточке» в личных данных."
              : "Переключатели сохраняются в этом браузере. Отправка писем станет доступна после входа."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {signedIn && email ? (
            <button type="button" className={d.btnSecondary} onClick={() => onGoSection("identity")}>
              Изменить email
            </button>
          ) : null}
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-sky-500/25 ${
              d.isLight ? "bg-sky-50 text-sky-700" : "bg-sky-950/50 text-sky-300"
            }`}
            aria-hidden
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3-3z" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProfileNotificationsPanel({ d, prefs, setPrefs, authUser, onGoSection }: Props) {
  const signedIn = !!authUser;
  const email = resolveProfileNotificationEmail(prefs.profileEmail, authUser?.email);
  const togglesLocked = signedIn && !email;
  const n = prefs.notifications;

  return (
    <ProfileSectionFrame d={d} sectionId="notifications">
      <div className="flex min-w-0 flex-col gap-8">
        <NotificationsHero d={d} email={email} signedIn={signedIn} onGoSection={onGoSection} />

        {!signedIn ? (
          <p className={`${d.noticeBanner} px-4 py-3 text-[0.875rem] ${d.rSm}`}>
            <Link to="/login" className={d.link}>
              Войдите
            </Link>
            , чтобы получать email о завершении ретро и дайджесты.
          </p>
        ) : !email ? (
          <p className={`${d.noticeBanner} px-4 py-3 text-[0.875rem] ${d.rSm}`}>
            Укажите email в{" "}
            <button type="button" className={d.link} onClick={() => onGoSection("identity")}>
              личных данных
            </button>
            , чтобы включить рассылку.
          </p>
        ) : null}

        <ProfileCard d={d} title="Рассылка" description="Какие письма присылать на ваш адрес">
          <ProfileToggleRow
            d={d}
            label="Завершение ретро"
            hint="Когда фасилитатор закрыл сессию в комнате, где вы участвовали"
            checked={n.retroEnded}
            disabled={togglesLocked}
            onChange={(retroEnded) => setPrefs(patchNotifications(prefs, { retroEnded }))}
          />
          <ProfileToggleRow
            d={d}
            label="Еженедельный дайджест"
            hint="Краткая сводка посещённых комнат и активности"
            checked={n.weeklyDigest}
            disabled={togglesLocked}
            divided
            onChange={(weeklyDigest) => setPrefs(patchNotifications(prefs, { weeklyDigest }))}
          />
          <ProfileToggleRow
            d={d}
            label="Новости Retrogen"
            hint="Релизы и улучшения — не чаще раза в месяц"
            checked={n.productUpdates}
            disabled={togglesLocked}
            divided
            onChange={(productUpdates) => setPrefs(patchNotifications(prefs, { productUpdates }))}
          />
        </ProfileCard>

        <div className={`${d.insetGroup} px-4 py-3 text-[0.8125rem] leading-relaxed`}>
          <p className="font-medium text-[var(--ph-text)]">Как это работает сейчас</p>
          <p className={`mt-1 ${d.muted}`}>
            {signedIn
              ? "Настройки сохраняются локально и синхронизируются с аккаунтом. Отправка писем с сервера появится в следующем релизе — ваш выбор уже будет учтён."
              : "Переключатели сохраняются в этом браузере. После входа настройки синхронизируются с аккаунтом."}
          </p>
        </div>
      </div>
    </ProfileSectionFrame>
  );
}
