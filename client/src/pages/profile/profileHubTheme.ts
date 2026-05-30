export type ProfileSectionId =
  | "overview"
  | "identity"
  | "room"
  | "lobby"
  | "notepad"
  | "notifications"
  | "organization"
  | "billing"
  | "security"
  | "danger";

export type ProfileNavItem = {
  id: ProfileSectionId;
  label: string;
  hint?: string;
  locked?: boolean;
  lockReason?: string;
  guestHidden?: boolean;
  /** Скрыто из sidebar до релиза функции */
  navHidden?: boolean;
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
    locked: true,
    navHidden: true,
    guestHidden: true,
    lockReason: "Team+ и white-label (ВТБ, МТС)",
  },
  {
    id: "billing",
    label: "Тариф",
    locked: true,
    navHidden: true,
    guestHidden: true,
    lockReason: "Модули IAM, AI, ARCH",
  },
  { id: "security", label: "Безопасность", hint: "Сессия, защита аккаунта и конфиденциальность" },
  { id: "danger", label: "Опасная зона", hint: "Экспорт данных и удаление аккаунта", guestHidden: true },
];

/** Только видимые в sidebar пункты */
export const PROFILE_NAV_VISIBLE = PROFILE_NAV.filter((n) => !n.navHidden);

export const PROFILE_NAV_GROUPS: { title: string; ids: ProfileSectionId[] }[] = [
  { title: "Профиль", ids: ["overview", "identity", "room", "lobby", "notepad"] },
  { title: "Система", ids: ["notifications", "security", "danger"] },
];

const HASH_ALIASES: Record<string, ProfileSectionId> = {
  facilitator: "notepad",
};

export const DEFAULT_PROFILE_SECTION: ProfileSectionId = "overview";

export function parseProfileHash(): ProfileSectionId {
  const raw = window.location.hash.replace(/^#/, "");
  const id = (HASH_ALIASES[raw] ?? raw) as ProfileSectionId;
  const hit = PROFILE_NAV.find((n) => n.id === id);
  if (!hit) return DEFAULT_PROFILE_SECTION;
  if (hit.locked) return hit.id;
  if (hit.navHidden) return DEFAULT_PROFILE_SECTION;
  return hit.id;
}
