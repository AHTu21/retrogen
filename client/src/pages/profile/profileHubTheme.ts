export type ProfileSectionId =
  | "overview"
  | "identity"
  | "room"
  | "lobby"
  | "facilitator"
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
};

export const PROFILE_NAV: ProfileNavItem[] = [
  { id: "overview", label: "Обзор", hint: "Сводка и быстрые действия" },
  { id: "identity", label: "Личные данные", hint: "Имя, контакты, подпись" },
  { id: "room", label: "Доска", hint: "Оформление комнаты ретро" },
  { id: "lobby", label: "Лобби", hint: "История и избранное" },
  { id: "facilitator", label: "Фасилитатор", hint: "Сессии и блокнот" },
  {
    id: "notifications",
    label: "Уведомления",
    locked: true,
    lockReason: "Email о завершении ретро — в roadmap",
  },
  {
    id: "organization",
    label: "Организация",
    locked: true,
    lockReason: "Team+ и white-label (ВТБ, МТС)",
    guestHidden: true,
  },
  {
    id: "billing",
    label: "Тариф",
    locked: true,
    lockReason: "Модули IAM, AI, ARCH",
    guestHidden: true,
  },
  { id: "security", label: "Безопасность", hint: "Вход и сессии" },
  { id: "danger", label: "Опасная зона", hint: "Экспорт и удаление", guestHidden: true },
];

export const PROFILE_NAV_GROUPS: { title: string; ids: ProfileSectionId[] }[] = [
  { title: "Личное", ids: ["overview", "identity", "room", "lobby", "facilitator"] },
  { title: "Организация", ids: ["notifications", "organization", "billing"] },
  { title: "Система", ids: ["security", "danger"] },
];

export const DEFAULT_PROFILE_SECTION: ProfileSectionId = "overview";

export function parseProfileHash(): ProfileSectionId {
  const raw = window.location.hash.replace(/^#/, "");
  const hit = PROFILE_NAV.find((n) => n.id === raw);
  return hit && !hit.locked ? hit.id : DEFAULT_PROFILE_SECTION;
}

/** Оболочка в стиле Home (zinc + sky); акцент — через --ph-accent на .profile-hub */
export function profileShell(isLight: boolean) {
  return {
    page: isLight ? "bg-zinc-50 text-zinc-900" : "bg-zinc-950 text-zinc-100",
    sticky: isLight ? "border-zinc-200/90 bg-zinc-50/85" : "border-zinc-700/90 bg-zinc-950/85",
    card: isLight ? "border-zinc-200 bg-white shadow-sm" : "border-zinc-700 bg-zinc-900/50 shadow-sm",
    cardMuted: isLight ? "border-zinc-200/80 bg-zinc-50/80" : "border-zinc-700/60 bg-zinc-900/30",
    muted: isLight ? "text-zinc-600" : "text-zinc-400",
    label: isLight ? "text-zinc-500" : "text-zinc-500",
    accent: "text-[var(--ph-accent)]",
    accentBg: "bg-[var(--ph-accent)]",
    accentRing: "ring-[var(--ph-accent)]/35",
    link: isLight ? "text-sky-700 hover:underline" : "text-sky-400 hover:underline",
    btnPrimary: "bg-sky-600 text-white hover:bg-sky-500 dark:bg-sky-500 dark:hover:bg-sky-400",
    input: isLight
      ? "border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400"
      : "border-zinc-600 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500",
    navActive: isLight
      ? "border-l-2 border-sky-500 bg-sky-50/80 pl-[0.55rem] text-zinc-900"
      : "border-l-2 border-sky-400 bg-sky-500/10 pl-[0.55rem] text-zinc-100",
    navIdle: isLight
      ? "border-l-2 border-transparent pl-[0.55rem] text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      : "border-l-2 border-transparent pl-[0.55rem] text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100",
    navLocked: isLight ? "text-zinc-400" : "text-zinc-600",
    badge: isLight ? "bg-sky-100 text-sky-900" : "bg-sky-950/50 text-sky-300",
    badgeMuted: isLight ? "bg-zinc-200 text-zinc-700" : "bg-zinc-800 text-zinc-300",
    bannerGuest: isLight
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : "border-amber-900/40 bg-amber-950/30 text-amber-100",
    notepad: isLight ? "border-amber-200/80 bg-amber-50/90" : "border-amber-900/40 bg-amber-950/25",
    danger: isLight ? "border-red-200 bg-red-50/80" : "border-red-900/50 bg-red-950/25",
    bentoHighlight: isLight
      ? "border-sky-200/60 bg-gradient-to-br from-sky-50/80 to-white"
      : "border-sky-900/40 bg-gradient-to-br from-sky-950/30 to-zinc-900/40",
  };
}

export function fieldClass(isLight: boolean, extra = "") {
  const s = profileShell(isLight);
  return `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500/30 ${s.input} ${extra}`;
}

/** @deprecated use profileShell */
export function hubClasses(isLight: boolean) {
  const s = profileShell(isLight);
  return {
    page: s.page,
    sticky: s.sticky,
    sidebar: s.card,
    navActive: s.navActive,
    navIdle: s.navIdle,
    navLocked: s.navLocked,
    panel: s.card,
    muted: s.muted,
    accent: s.accent,
    input: s.input,
    stat: s.cardMuted,
    bannerGuest: s.bannerGuest,
    saveBar: `${s.card} backdrop-blur`,
    btnPrimary: s.btnPrimary,
    identityStrip: s.card,
    avatarRing: isLight ? "border-zinc-200 bg-zinc-100" : "border-zinc-600 bg-zinc-800",
  };
}
