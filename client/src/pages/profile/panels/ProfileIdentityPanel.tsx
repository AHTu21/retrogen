import { useMemo } from "react";
import type { AuthUserDto } from "../../../api";
import { validateTelegram, validateWebsite } from "../../../lib/profileIdentityValidation";
import type { UserProfilePrefs } from "../../../lib/profilePrefs";
import type { ProfileDesign } from "../profileDesign";
import {
  PROFILE_PRONOUN_PRESETS,
  PROFILE_ROLE_SUGGESTIONS,
  PROFILE_TIMEZONE_PRESETS,
} from "../profileIdentityOptions";
import { displayHandle, initials } from "../profileUser";
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
}: {
  d: ProfileDesign;
  prefs: UserProfilePrefs;
  authUser: AuthUserDto | null;
}) {
  const name = displayHandle(prefs, authUser);
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
          {prefs.avatarDataUrl ? (
            <img src={prefs.avatarDataUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(prefs, authUser)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold text-[var(--ph-text)]">{name}</p>
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

export function ProfileIdentityPanel({ d, prefs, setPrefs, authUser }: Props) {
  const roleListId = "profile-role-suggestions";
  const telegramError = useMemo(() => validateTelegram(prefs.telegram), [prefs.telegram]);
  const websiteError = useMemo(() => validateWebsite(prefs.website), [prefs.website]);

  return (
    <ProfileSectionFrame d={d} sectionId="identity">
      <p className={`text-[0.875rem] leading-relaxed ${d.muted}`}>
        Заполните профиль так, как вас увидят участники ретро. Фото — в карточке слева. Email аккаунта меняется
        только после входа.
      </p>

      <IdentityPreview d={d} prefs={prefs} authUser={authUser} />

      {authUser ? (
        <ProfileCard d={d} title="Аккаунт">
          <ProfileValueRow d={d} label="Email для входа" value={authUser.email} />
        </ProfileCard>
      ) : null}

      <ProfileCard d={d} title="Имя и роль" description="Первая строка в списке участников и на стикерах.">
        <ProfileField d={d} label="Имя" hint="Как к вам обращаться в комнате">
          <input
            className={d.field()}
            value={prefs.displayName}
            placeholder="Иван Петров"
            maxLength={60}
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
            maxLength={200}
            onChange={(e) => setPrefs({ ...prefs, signature: e.target.value })}
          />
          <ProfileCharCount d={d} current={prefs.signature.length} max={200} />
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
            maxLength={32}
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
            maxLength={200}
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
            maxLength={40}
            autoComplete="tel"
            onChange={(e) => setPrefs({ ...prefs, contact: e.target.value })}
          />
        </ProfileField>
      </ProfileCard>
    </ProfileSectionFrame>
  );
}
