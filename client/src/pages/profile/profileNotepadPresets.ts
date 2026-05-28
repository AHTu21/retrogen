/** Быстрые вставки для блокнота фасилитатора */

export const NOTEPAD_MAX_LENGTH = 12_000;

/** Высота строки = шаг горизонтальных линий в редакторе (px) */
export const NOTEPAD_LINE_HEIGHT_PX = 24;

export const NOTEPAD_PLACEHOLDER =
  "Начните с цели ретро или нажмите «План» выше — шаблон подставится в курсор.";

export function notepadLinedBackground(): string {
  const h = NOTEPAD_LINE_HEIGHT_PX;
  const line = `color-mix(in srgb, var(--ph-muted) 14%, transparent)`;
  return `repeating-linear-gradient(to bottom, transparent 0, transparent ${h - 1}px, ${line} ${h - 1}px, ${line} ${h}px)`;
}

export type NotepadSnippet = {
  id: string;
  label: string;
  icon: string;
  text: string;
};

export const NOTEPAD_SNIPPETS: NotepadSnippet[] = [
  {
    id: "goal",
    label: "Цель",
    icon: "🎯",
    text: "Цель ретро:\n— \n",
  },
  {
    id: "agenda",
    label: "План",
    icon: "📋",
    text: "План сессии (45 мин):\n1. Check-in — 5 мин\n2. Сбор — 15 мин\n3. Голосование — 5 мин\n4. Обсуждение — 15 мин\n5. Action items — 5 мин\n",
  },
  {
    id: "links",
    label: "Ссылки",
    icon: "🔗",
    text: "Ссылки:\n• Доска: \n• Confluence / Wiki: \n• Запись встречи: \n",
  },
  {
    id: "actions",
    label: "Actions",
    icon: "✅",
    text: "Action items:\n• [ ] \n• [ ] \n• [ ] \n",
  },
  {
    id: "parking",
    label: "Парковка",
    icon: "🅿️",
    text: "Парковка тем (вне ретро):\n• \n",
  },
  {
    id: "retro",
    label: "Шаблон",
    icon: "📝",
    text: "Спринт: \n\nПлюсы:\n• \n\nМинусы:\n• \n\nДействия:\n• \n",
  },
];

export function notepadStats(text: string) {
  const trimmed = text.trim();
  const lines = text.length ? text.split(/\n/).length : 0;
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  return { chars: text.length, words, lines };
}
