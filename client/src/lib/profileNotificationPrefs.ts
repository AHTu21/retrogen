/** Email-уведомления профиля — локальные prefs до подключения серверной рассылки. */
export type ProfileEmailNotifications = {
  /** Письмо, когда фасилитатор завершил ретро в комнате, где вы участвовали */
  retroEnded: boolean;
  /** Краткий дайджест активности за неделю */
  weeklyDigest: boolean;
  /** Новости продукта и крупные обновления Retrogen */
  productUpdates: boolean;
};

export const DEFAULT_PROFILE_NOTIFICATIONS: ProfileEmailNotifications = {
  retroEnded: true,
  weeklyDigest: false,
  productUpdates: false,
};

export function normalizeProfileNotifications(raw: unknown): ProfileEmailNotifications {
  const o = raw && typeof raw === "object" ? (raw as Partial<ProfileEmailNotifications>) : {};
  return {
    retroEnded: o.retroEnded !== false,
    weeklyDigest: o.weeklyDigest === true,
    productUpdates: o.productUpdates === true,
  };
}

/** Адрес для будущих писем: profileEmail → email аккаунта. */
export function resolveProfileNotificationEmail(
  profileEmail: string,
  accountEmail: string | undefined,
): string {
  const custom = profileEmail.trim();
  if (custom) return custom;
  return accountEmail?.trim() || "";
}
