import { DEFAULT_PROFILE_SECTION, type ProfileSectionId } from "../../lib/profileSections";

export type { ProfileSectionId };
export { DEFAULT_PROFILE_SECTION };

export type ProfileNavItem = {
  id: ProfileSectionId;
  label: string;
  hint?: string;
  locked?: boolean;
  lockReason?: string;
  guestHidden?: boolean;
  navHidden?: boolean;
  navBadge?: string;
};

export const PROFILE_NAV: ProfileNavItem[] = [
  { id: "overview", label: "Обзор", hint: "Приветствие, сводка, быстрые действия и прогресс профиля" },
  { id: "identity", label: "Личные данные", hint: "Имя, роль и ссылки — как вас видят в комнате" },
  { id: "room", label: "Оформление доски", hint: "Готовые темы, палитра комнаты, курсор и обои — с живым превью" },
  { id: "lobby", label: "Лобби и комнаты", hint: "Избранное, история посещений и быстрый вход в лобби" },
  { id: "notepad", label: "Блокнот", hint: "Личные заметки, шаблоны вставок и автосохранение" },
  {
    id: "notifications",
    label: "Уведомления",
    hint: "Email о завершении ретро, дайджест и новости — настройки сохраняются в профиле",
  },
  {
    id: "organization",
    label: "Организация",
    hint: "Team+, SSO и white-label — предпросмотр корпоративных возможностей",
    guestHidden: true,
    navBadge: "Preview",
  },
  {
    id: "billing",
    label: "Тариф",
    hint: "Сравнение планов Free / Team / Enterprise и модулей IAM · AI · ARCH",
    guestHidden: true,
    navBadge: "Preview",
  },
  { id: "security", label: "Безопасность", hint: "Сессия, защита аккаунта и конфиденциальность" },
  { id: "danger", label: "Опасная зона", hint: "Экспорт данных и удаление аккаунта", guestHidden: true },
];

export const PROFILE_NAV_VISIBLE = PROFILE_NAV.filter((n) => !n.navHidden);

export const PROFILE_NAV_GROUPS: { title: string; ids: ProfileSectionId[] }[] = [
  { title: "Профиль", ids: ["overview", "identity", "room", "lobby", "notepad"] },
  { title: "Корпоратив", ids: ["organization", "billing"] },
  { title: "Система", ids: ["notifications", "security", "danger"] },
];

const HASH_ALIASES: Record<string, ProfileSectionId> = {
  facilitator: "notepad",
};

export function parseProfileHash(): ProfileSectionId {
  const raw = window.location.hash.replace(/^#/, "");
  const id = (HASH_ALIASES[raw] ?? raw) as ProfileSectionId;
  const hit = PROFILE_NAV.find((n) => n.id === id);
  if (!hit) return DEFAULT_PROFILE_SECTION;
  if (hit.locked) return hit.id;
  if (hit.navHidden) return DEFAULT_PROFILE_SECTION;
  return hit.id;
}
