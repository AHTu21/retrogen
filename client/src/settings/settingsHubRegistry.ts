import type { SettingsSectionMeta } from "./settingsHubTypes";

export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  {
    id: "general",
    label: "Общие",
    description: "Тема, углы интерфейса и подсказки",
    group: "app",
    groupLabel: "Приложение",
    status: "ready",
    keywords: ["тема", "светлая", "тёмная", "углы", "подсказки"],
  },
  {
    id: "profile",
    label: "Профиль",
    description: "Имя, контакты и переход в полный профиль",
    group: "profile",
    groupLabel: "Аккаунт",
    status: "ready",
    keywords: ["имя", "telegram", "сайт", "аватар"],
  },
  {
    id: "notifications",
    label: "Уведомления",
    description: "Email-рассылки и напоминания",
    group: "profile",
    groupLabel: "Аккаунт",
    status: "ready",
    keywords: ["email", "письма", "напоминания"],
  },
  {
    id: "security",
    label: "Безопасность",
    description: "Сессия, резервная копия и выход",
    group: "profile",
    groupLabel: "Аккаунт",
    status: "ready",
    keywords: ["выход", "backup", "экспорт", "импорт"],
  },
  {
    id: "board",
    label: "Доска",
    description: "Фон, шапка комнаты, курсор и обои",
    group: "modules",
    groupLabel: "Модули",
    status: "ready",
    keywords: ["комната", "retro", "фон", "обои", "курсор"],
  },
  {
    id: "chat",
    label: "Мессенджер",
    description: "Оформление карточки профиля в чате",
    group: "modules",
    groupLabel: "Модули",
    status: "ready",
    keywords: ["чат", "messages", "градиент", "аватар"],
  },
  {
    id: "workshop",
    label: "Мастерская",
    description: "Шаблоны и пресеты — скоро",
    group: "modules",
    groupLabel: "Модули",
    status: "soon",
    keywords: ["workshop", "шаблоны"],
  },
];

export function getSettingsSection(id: string): SettingsSectionMeta | undefined {
  return SETTINGS_SECTIONS.find((s) => s.id === id);
}

export function settingsSectionsByGroup(): { groupLabel: string; items: SettingsSectionMeta[] }[] {
  const order = ["app", "profile", "modules"] as const;
  const labels: Record<(typeof order)[number], string> = {
    app: "Приложение",
    profile: "Аккаунт",
    modules: "Модули",
  };
  return order.map((group) => ({
    groupLabel: labels[group],
    items: SETTINGS_SECTIONS.filter((s) => s.group === group),
  }));
}
