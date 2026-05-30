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
}: {
  d: ProfileDesign;
  email: string;
  signedIn: boolean;
}) {
  const headline = signedIn
    ? email
      ? "Письма на ваш email"
      : "Добавьте email"
    : "После входа";

  return (
    <div
      className={`relative overflow-hidden ${d.insetGroup} bg-gradient-to-br from-violet-500/10 via-[var(--ph-surface)] to-[var(--ph-surface-elevated)] p-5 sm:p-6 dark:from-violet-950/35`}
    >
      <div className="relative z-[1] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 max-w-xl">
          <p className={`text-[0.6875rem] font-semibold uppercase tracking-wide ${d.muted}`}>Уведомления</p>
          <h2 className="mt-1 text-[1.125rem] font-semibold tracking-[-0.02em] text-[var(--ph-text)] sm:text-[1.25rem]">
            {headline}
          </h2>
          <p className={`mt-2 text-[0.8125rem] leading-relaxed ${d.muted}`}>
            {signedIn
              ? email
                ? `Адрес доставки: ${email}. Изменить — в «Личных данных».`
                : "Укажите email в аккаунте или в поле «Email в карточке» в личных данных."
              : "Переключатели сохраняются в этом браузере. Отправка писем станет доступна после входа."}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ring-1 ring-violet-500/25 ${
            d.isLight ? "bg-violet-50" : "bg-violet-950/50"
          }`}
          aria-hidden
        >
          ✉
        </span>
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
        <NotificationsHero d={d} email={email} signedIn={signedIn} />

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

        <div className={`${d.noticeInfo} px-4 py-3 text-[0.8125rem] leading-relaxed ${d.rSm}`}>
          <p className="font-medium">Как это работает сейчас</p>
          <p className="mt-1 opacity-90">
            Настройки сохраняются в этом браузере и синхронизируются с аккаунтом после входа. Отправка писем с сервера
            появится в следующем релизе — ваш выбор уже будет учтён.
          </p>
        </div>
      </div>
    </ProfileSectionFrame>
  );
}
