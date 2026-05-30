import type { UserProfilePrefs } from "../../lib/profilePrefs";
import { resolveProfileNotificationEmail } from "../../lib/profileNotificationPrefs";
import { ProfileCard, ProfileToggleRow } from "../../pages/profile/profileUi";
import { useSettingsHubPrefs } from "../SettingsHubProvider";
import {
  SettingsHubFootnote,
  SettingsHubLink,
  SettingsHubNotice,
  SettingsHubPanel,
  SettingsHubSectionHeader,
} from "../settingsHubUi";

function patchNotifications(prefs: UserProfilePrefs, patch: Partial<UserProfilePrefs["notifications"]>): UserProfilePrefs {
  return { ...prefs, notifications: { ...prefs.notifications, ...patch } };
}

export function SettingsNotificationsPanel() {
  const { d, prefs, setPrefs, authUser } = useSettingsHubPrefs();
  const signedIn = !!authUser;
  const email = resolveProfileNotificationEmail(prefs.profileEmail, authUser?.email);
  const togglesLocked = signedIn && !email;
  const n = prefs.notifications;

  return (
    <SettingsHubPanel>
      <SettingsHubSectionHeader sectionId="notifications" d={d} />

      {!signedIn ? (
        <SettingsHubNotice d={d}>
          Войдите в аккаунт, чтобы получать письма на email.{" "}
          <SettingsHubLink to="/login" className={d.link}>
            Вход
          </SettingsHubLink>
        </SettingsHubNotice>
      ) : !email ? (
        <SettingsHubNotice d={d} variant="banner">
          Укажите email в{" "}
          <SettingsHubLink to="/profile#identity" className={d.link}>
            личных данных
          </SettingsHubLink>
          , чтобы включить рассылку.
        </SettingsHubNotice>
      ) : (
        <SettingsHubNotice d={d}>
          Письма будут отправляться на <strong className="font-medium text-[var(--ph-text)]">{email}</strong>.
        </SettingsHubNotice>
      )}

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
          label="Новости продукта"
          hint="Редкие письма о новых возможностях"
          checked={n.productUpdates}
          disabled={togglesLocked}
          divided
          onChange={(productUpdates) => setPrefs(patchNotifications(prefs, { productUpdates }))}
        />
      </ProfileCard>

      <SettingsHubFootnote d={d}>
        <SettingsHubLink to="/profile#notifications" className={d.link}>
          Расширенные настройки уведомлений →
        </SettingsHubLink>
      </SettingsHubFootnote>
    </SettingsHubPanel>
  );
}
