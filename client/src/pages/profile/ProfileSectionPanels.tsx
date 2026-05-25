import { Link } from "react-router-dom";
import type { AuthUserDto } from "../../api";
import type { UserProfilePrefs } from "../../lib/profilePrefs";
import type { VisitedRoomEntry } from "../../lib/roomLobbyPrefs";
import type { ProfileDesign } from "./profileDesign";
import { PROFILE_NAV, type ProfileSectionId } from "./profileHubTheme";
import { ProfileRoomPanel } from "./ProfileRoomPanel";
import { displayHandle } from "./profileUser";
import {
  ProfileActions,
  ProfileCard,
  ProfileEmpty,
  ProfileField,
  ProfileListRow,
  ProfileMetrics,
  ProfileSectionFrame,
} from "./profileUi";

export type ProfilePanelsProps = {
  d: ProfileDesign;
  section: ProfileSectionId;
  prefs: UserProfilePrefs;
  setPrefs: React.Dispatch<React.SetStateAction<UserProfilePrefs>>;
  authUser: AuthUserDto | null;
  visited: VisitedRoomEntry[];
  visitedCount: number;
  favoriteCount: number;
  onWallpaperFile: (f: File | undefined) => void;
  onLogout: () => void;
  onGoSection: (id: ProfileSectionId) => void;
};

export function ProfileSectionPanels({
  d,
  section,
  prefs,
  setPrefs,
  authUser,
  visited,
  visitedCount,
  favoriteCount,
  onWallpaperFile,
  onLogout,
  onGoSection,
}: ProfilePanelsProps) {
  if (section === "overview") {
    const name = displayHandle(prefs, authUser);
    return (
      <ProfileSectionFrame d={d} sectionId="overview">
        <p className={`text-[0.8125rem] leading-relaxed ${d.muted}`}>
          Здравствуйте, <span className="font-medium text-[var(--ph-text)]">{name}</span>. Сводка активности и быстрые
          действия.
        </p>
        <ProfileActions d={d}>
          <Link to="/home" className={d.btnPrimary}>
            Открыть лобби
          </Link>
          <Link to="/workshop" className={d.btnSecondary}>
            Мастерская шаблонов
          </Link>
          <button type="button" className={d.btnSecondary} onClick={() => onGoSection("room")}>
            Оформление доски
          </button>
        </ProfileActions>
        <ProfileMetrics
          d={d}
          items={[
            { label: "Сессий в истории", value: visitedCount },
            { label: "В избранном", value: favoriteCount },
            { label: "Фон доски", value: prefs.boardBackdrop.trim() ? "настроен" : "по умолчанию" },
          ]}
        />
        <ProfileCard d={d} title="Недавние сессии" description="Комнаты из этого браузера.">
          {visited.length ? (
            <div className={`divide-y ${d.divider}`}>
              {visited.map((v) => (
                <ProfileListRow
                  key={v.slug}
                  d={d}
                  to={`/r/${v.slug}`}
                  title={v.themeSanitized || v.slug}
                  badge={{ text: v.status === "ended" ? "завершено" : "в эфире", live: v.status !== "ended" }}
                />
              ))}
            </div>
          ) : (
            <p className={`px-6 py-8 text-sm ${d.muted}`}>Создайте комнату в лобби.</p>
          )}
        </ProfileCard>
      </ProfileSectionFrame>
    );
  }

  if (section === "identity") {
    return (
      <ProfileSectionFrame d={d} sectionId="identity">
        <ProfileCard
          d={d}
          title="Профиль"
          description="Имя и контакты — в комнате и в карточке слева. Фото меняется кнопкой «Сменить фото» в боковой панели."
        >
          <ProfileField d={d} label="Имя">
            <input
              className={d.field()}
              value={prefs.displayName}
              placeholder="Как к вам обращаться"
              onChange={(e) => setPrefs({ ...prefs, displayName: e.target.value })}
            />
          </ProfileField>
          <ProfileField d={d} label="Подпись" hint="Коротко о себе" divided>
            <textarea
              className={`${d.field()} min-h-[4.5rem]`}
              value={prefs.signature}
              onChange={(e) => setPrefs({ ...prefs, signature: e.target.value })}
            />
          </ProfileField>
          <ProfileField d={d} label="Город" divided>
            <input className={d.field()} value={prefs.city} onChange={(e) => setPrefs({ ...prefs, city: e.target.value })} />
          </ProfileField>
          <ProfileField d={d} label="Контакты" divided>
            <textarea
              className={`${d.field()} min-h-[5rem]`}
              value={prefs.contact}
              placeholder="Email, Telegram…"
              onChange={(e) => setPrefs({ ...prefs, contact: e.target.value })}
            />
          </ProfileField>
          <ProfileField d={d} label="Дополнительно" hint="Необязательно" divided>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className={d.field()}
                value={prefs.gender}
                placeholder="Пол"
                onChange={(e) => setPrefs({ ...prefs, gender: e.target.value })}
              />
              <input
                className={d.field()}
                value={prefs.birthDate}
                placeholder="Дата рождения"
                onChange={(e) => setPrefs({ ...prefs, birthDate: e.target.value })}
              />
              <textarea
                className={`${d.field()} min-h-[4rem] sm:col-span-2`}
                value={prefs.devices}
                placeholder="Устройства"
                onChange={(e) => setPrefs({ ...prefs, devices: e.target.value })}
              />
            </div>
          </ProfileField>
        </ProfileCard>
      </ProfileSectionFrame>
    );
  }

  if (section === "room") {
    return (
      <ProfileSectionFrame d={d} sectionId="room" compact>
        <ProfileRoomPanel
          d={d}
          prefs={prefs}
          setPrefs={setPrefs}
          onWallpaperFile={onWallpaperFile}
          onWallpaperClear={() => setPrefs({ ...prefs, wallpaperDataUrl: null })}
        />
      </ProfileSectionFrame>
    );
  }

  if (section === "lobby") {
    return (
      <ProfileSectionFrame d={d} sectionId="lobby">
        <ProfileMetrics
          d={d}
          items={[
            { label: "История", value: visitedCount },
            { label: "Избранное", value: favoriteCount },
          ]}
        />
        <p className={`text-sm ${d.muted}`}>Списки редактируются на главной странице.</p>
        <Link to="/home" className={`inline-flex text-sm font-medium ${d.link}`}>
          Перейти в лобби →
        </Link>
      </ProfileSectionFrame>
    );
  }

  if (section === "facilitator") {
    return (
      <ProfileSectionFrame d={d} sectionId="facilitator">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={`${d.card} p-6`}>
            <p className={d.label}>Проведённых сессий</p>
            <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">{visitedCount}</p>
            <Link to="/workshop" className={`mt-5 inline-flex text-sm font-medium ${d.link}`}>
              Шаблоны в мастерской →
            </Link>
          </div>
          <ProfileCard d={d} title="Блокнот" description="Личные заметки, не видны участникам.">
            <div className="p-4">
              <textarea
                className={`${d.field()} min-h-[12rem] resize-y`}
                value={prefs.notepad}
                placeholder="План ретро, ссылки, action items…"
                onChange={(e) => setPrefs({ ...prefs, notepad: e.target.value })}
              />
            </div>
          </ProfileCard>
        </div>
      </ProfileSectionFrame>
    );
  }

  if (section === "organization" || section === "billing" || section === "notifications") {
    const meta = PROFILE_NAV.find((n) => n.id === section)!;
    return (
      <ProfileSectionFrame d={d} sectionId={section}>
        <ProfileEmpty d={d}>{meta.lockReason ?? "Раздел в разработке"}</ProfileEmpty>
      </ProfileSectionFrame>
    );
  }

  if (section === "security") {
    return (
      <ProfileSectionFrame d={d} sectionId="security">
        <ProfileCard d={d} title="Аккаунт">
          <ProfileField d={d} label="Сессия">
            {authUser ? (
              <button type="button" className={`text-sm font-medium ${d.link}`} onClick={onLogout}>
                Выйти
              </button>
            ) : (
              <Link to="/login" className={`text-sm font-medium ${d.link}`}>
                Войти
              </Link>
            )}
          </ProfileField>
          <ProfileField d={d} label="Пароль и 2FA" hint="Пакет Business+" divided>
            <p className={`text-sm ${d.muted}`}>Self-service появится в следующих релизах.</p>
          </ProfileField>
        </ProfileCard>
      </ProfileSectionFrame>
    );
  }

  if (section === "danger") {
    return (
      <ProfileSectionFrame d={d} sectionId="danger">
        <div className={`${d.noticeDanger} p-6 ${d.rSm}`}>
          <h2 className="text-sm font-semibold">Экспорт и удаление</h2>
          <p className={`mt-2 max-w-lg text-sm leading-relaxed ${d.muted}`}>
            Запрос персональных данных и удаление аккаунта — по регламенту для корпоративных клиентов.
          </p>
          <button type="button" disabled className={`mt-5 ${d.btnSecondary} opacity-50`}>
            Запросить экспорт (скоро)
          </button>
        </div>
      </ProfileSectionFrame>
    );
  }

  return null;
}
