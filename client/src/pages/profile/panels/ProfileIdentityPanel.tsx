import { Link } from "react-router-dom";
import { useMemo } from "react";
import type { AuthUserDto } from "../../../api";
import {
  PROFILE_CONTACT_MAX,
  PROFILE_DISPLAY_NAME_MAX,
  PROFILE_PROFILE_EMAIL_MAX,
  PROFILE_SIGNATURE_MAX,
  PROFILE_TELEGRAM_MAX,
  PROFILE_WEBSITE_MAX,
  clampSignature,
} from "../../../lib/profileFormFields";
import { validateTelegram, validateWebsite } from "../../../lib/profileIdentityValidation";
import type { UserProfilePrefs } from "../../../lib/profilePrefs";
import { ProfileEmojiStatusField } from "../ProfileEmojiStatusField";
import type { ProfileDesign } from "../profileDesign";
import type { ProfileSectionId } from "../profileHubTheme";
import {
  PROFILE_PRONOUN_PRESETS,
  PROFILE_ROLE_SUGGESTIONS,
  PROFILE_TIMEZONE_PRESETS,
} from "../profileIdentityOptions";
import { displayNameWithStatus, initials } from "../profileUser";
import {
  ProfileCard,
  ProfileCharCount,
  ProfileField,
  ProfileSectionFrame,
  ProfilePrefixedInput,
  ProfileSelect,
  ProfileValueRow,
} from "../profileUi";

type Props = {
  d: ProfileDesign;
  prefs: UserProfilePrefs;
  setPrefs: React.Dispatch<React.SetStateAction<UserProfilePrefs>>;
  authUser: AuthUserDto | null;
  onGoSection: (id: ProfileSectionId) => void;
  avatarSrc?: string | null;
  cloudSyncLabel?: string | null;
};

function normalizeTelegram(raw: string) {
  return raw.trim().replace(/^@+/, "");
}

function normalizeWebsite(raw: string) {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function IdentityPreview({
  d,
  prefs,
  authUser,
  avatarSrc,
}: {
  d: ProfileDesign;
  prefs: UserProfilePrefs;
  authUser: AuthUserDto | null;
  avatarSrc?: string | null;
}) {
  const displayAvatar = avatarSrc ?? prefs.avatarDataUrl;
  const roleLine = [prefs.roleTitle.trim(), prefs.teamName.trim()].filter(Boolean).join(" · ");
  const locationLine = [prefs.city.trim(), prefs.timezone.trim() ? timezoneLabel(prefs.timezone) : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={`${d.insetGroup} px-4 py-4 sm:px-5 sm:py-5`}>
      <p className={`mb-3 text-[0.6875rem] font-semibold uppercase tracking-wide ${d.muted}`}>Превью в комнате</p>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--ph-surface-elevated)] text-sm font-semibold text-[var(--ph-muted)] ring-1 ring-[var(--ph-border)]`}
        >
          {displayAvatar ? (
            <img src={displayAvatar} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(prefs, authUser)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold text-[var(--ph-text)]">
            {displayNameWithStatus(prefs, authUser)}
          </p>
          {prefs.pronouns.trim() ? <p className={`text-[0.75rem] ${d.muted}`}>{prefs.pronouns.trim()}</p> : null}
          {roleLine ? <p className={`mt-0.5 text-[0.8125rem] ${d.muted}`}>{roleLine}</p> : null}
          {prefs.signature.trim() ? (
            <p className={`mt-1.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-[var(--ph-text)]`}>
              {prefs.signature.trim()}
            </p>
          ) : (
            <p className={`mt-1.5 text-[0.8125rem] italic ${d.muted}`}>Добавьте короткое «О себе»</p>
          )}
          {locationLine ? <p className={`mt-1 text-[0.75rem] ${d.muted}`}>{locationLine}</p> : null}
        </div>
      </div>
    </div>
  );
}

function timezoneLabel(value: string) {
  return PROFILE_TIMEZONE_PRESETS.find((z) => z.value === value)?.label.split(" (")[0] ?? value;
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-1 text-[0.75rem] text-amber-700 dark:text-amber-300">{message}</p>;
}

export function ProfileIdentityPanel({ d, prefs, setPrefs, authUser, onGoSection, cloudSyncLabel, avatarSrc }: Props) {
  const roleListId = "profile-role-suggestions";
  const telegramError = useMemo(() => validateTelegram(prefs.telegram), [prefs.telegram]);
  const websiteError = useMemo(() => validateWebsite(prefs.website), [prefs.website]);

  return (
    <ProfileSectionFrame d={d} sectionId="identity">
      <p className={`text-[0.875rem] leading-relaxed ${d.muted}`}>
        Единая карточка для комнаты и мессенджера: имя, статус, контакты и «О себе». Фото — в карточке слева.
      </p>

      {!authUser ? (
        <p className={`${d.noticeBanner} px-4 py-3 text-[0.875rem] ${d.rSm}`}>
          Гостевой режим — данные только в этом браузере.{" "}
            <Link to="/login?returnTo=%2Fprofile" className={d.link}>
            Войдите
          </Link>
          , чтобы синхронизировать профиль между устройствами.
        </p>
      ) : cloudSyncLabel ? (
        <p className={`${d.noticeInfo} px-4 py-3 text-[0.8125rem] leading-relaxed ${d.rSm}`}>
          <span className="font-medium">Облако:</span> {cloudSyncLabel}. Текстовые настройки и уведомления — на сервере; аватар и обои загружаются отдельно после входа.
        </p>
      ) : null}

        <IdentityPreview d={d} prefs={prefs} authUser={authUser} avatarSrc={avatarSrc} />

      {authUser ? (
        <ProfileCard d={d} title="Аккаунт">
          <ProfileValueRow d={d} label="Email для входа" value={authUser.email} />
          <ProfileField d={d} label="Email в карточке" hint="Как показывать в мессенджере; пусто — email входа" divided>
            <input
              className={d.field()}
              type="email"
              value={prefs.profileEmail}
              placeholder={authUser.email}
              maxLength={PROFILE_PROFILE_EMAIL_MAX}
              autoComplete="email"
              onChange={(e) =>
                setPrefs({ ...prefs, profileEmail: e.target.value.slice(0, PROFILE_PROFILE_EMAIL_MAX) })
              }
              onBlur={(e) =>
                setPrefs({ ...prefs, profileEmail: e.target.value.trim().slice(0, PROFILE_PROFILE_EMAIL_MAX) })
              }
            />
          </ProfileField>
          <div className={`flex flex-col gap-3 border-t px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:py-4 ${d.insetRow}`}>
            <div className="min-w-0">
              <p className="text-[0.8125rem] font-medium text-[var(--ph-text)]">Email-уведомления</p>
              <p className={`mt-0.5 text-[0.75rem] ${d.muted}`}>Завершение ретро, дайджест и новости продукта</p>
            </div>
            <button type="button" className={`${d.btnSecondary} shrink-0`} onClick={() => onGoSection("notifications")}>
              Настроить
            </button>
          </div>
        </ProfileCard>
      ) : null}

      <ProfileCard d={d} title="Статус" description="Эмодзи рядом с именем в мессенджере и списках участников.">
        <ProfileField d={d} label="Эмодзи-статус">
          <ProfileEmojiStatusField
            d={d}
            value={prefs.emojiStatus}
            onChange={(emojiStatus) => setPrefs({ ...prefs, emojiStatus })}
          />
        </ProfileField>
      </ProfileCard>

      <ProfileCard d={d} title="Имя и роль" description="Первая строка в списке участников и на стикерах.">
        <ProfileField d={d} label="Имя" hint="Как к вам обращаться в комнате">
          <input
            className={d.field()}
            value={prefs.displayName}
            placeholder="Иван Петров"
            maxLength={PROFILE_DISPLAY_NAME_MAX}
            autoComplete="name"
            onChange={(e) => setPrefs({ ...prefs, displayName: e.target.value })}
          />
        </ProfileField>
        <ProfileField d={d} label="Роль" hint="Должность или роль на сессии" divided>
          <input
            className={d.field()}
            value={prefs.roleTitle}
            placeholder="Фасилитатор"
            maxLength={60}
            list={roleListId}
            onChange={(e) => setPrefs({ ...prefs, roleTitle: e.target.value })}
          />
          <datalist id={roleListId}>
            {PROFILE_ROLE_SUGGESTIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </ProfileField>
        <ProfileField d={d} label="Команда" hint="Продукт, отдел или компания" divided>
          <input
            className={d.field()}
            value={prefs.teamName}
            placeholder="Команда Retrogen"
            maxLength={80}
            onChange={(e) => setPrefs({ ...prefs, teamName: e.target.value })}
          />
        </ProfileField>
        <ProfileField d={d} label="Местоимения" hint="По желанию" divided>
          <ProfileSelect
            d={d}
            value={prefs.pronouns}
            onChange={(pronouns) => setPrefs({ ...prefs, pronouns })}
            options={PROFILE_PRONOUN_PRESETS}
          />
        </ProfileField>
        <ProfileField d={d} label="О себе" hint="1–2 предложения для карточки участника" divided stacked>
          <textarea
            className={`${d.field()} min-h-[4.5rem] resize-y`}
            value={prefs.signature}
            placeholder="Помогаю команде проводить ретро и фиксировать договорённости."
            maxLength={PROFILE_SIGNATURE_MAX}
            onChange={(e) => setPrefs({ ...prefs, signature: clampSignature(e.target.value) })}
          />
          <ProfileCharCount d={d} current={prefs.signature.length} max={PROFILE_SIGNATURE_MAX} />
        </ProfileField>
      </ProfileCard>

      <ProfileCard d={d} title="Локация" description="Помогает понять ваш часовой пояс при планировании.">
        <ProfileField d={d} label="Город">
          <input
            className={d.field()}
            value={prefs.city}
            placeholder="Москва"
            maxLength={60}
            autoComplete="address-level2"
            onChange={(e) => setPrefs({ ...prefs, city: e.target.value })}
          />
        </ProfileField>
        <ProfileField d={d} label="Часовой пояс" divided>
          <ProfileSelect
            d={d}
            value={prefs.timezone}
            onChange={(timezone) => setPrefs({ ...prefs, timezone })}
            options={PROFILE_TIMEZONE_PRESETS}
          />
        </ProfileField>
      </ProfileCard>

      <ProfileCard d={d} title="Связь" description="Ссылки и контакты — по желанию, видны в профиле в комнате.">
        <ProfileField d={d} label="Telegram" hint="Без символа @">
          <ProfilePrefixedInput
            d={d}
            prefix="@"
            value={prefs.telegram}
            placeholder="username"
            maxLength={PROFILE_TELEGRAM_MAX}
            autoComplete="off"
            aria-invalid={!!telegramError}
            onChange={(e) => setPrefs({ ...prefs, telegram: normalizeTelegram(e.target.value) })}
          />
          <FieldError message={telegramError} />
        </ProfileField>
        <ProfileField d={d} label="Сайт или LinkedIn" divided>
          <input
            className={d.field()}
            type="url"
            value={prefs.website}
            placeholder="https://example.com"
            maxLength={PROFILE_WEBSITE_MAX}
            aria-invalid={!!websiteError}
            onChange={(e) => setPrefs({ ...prefs, website: e.target.value })}
            onBlur={(e) => setPrefs({ ...prefs, website: normalizeWebsite(e.target.value) })}
          />
          <FieldError message={websiteError} />
        </ProfileField>
        <ProfileField d={d} label="Телефон" hint="Или другой способ связи" divided>
          <input
            className={d.field()}
            type="tel"
            value={prefs.contact}
            placeholder="+7 …"
            maxLength={PROFILE_CONTACT_MAX}
            autoComplete="tel"
            onChange={(e) => setPrefs({ ...prefs, contact: e.target.value })}
          />
        </ProfileField>
      </ProfileCard>
    </ProfileSectionFrame>
  );
}
