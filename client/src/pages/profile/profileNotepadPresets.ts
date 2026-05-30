/** Быстрые вставки для блокнота фасилитатора */

export { NOTEPAD_MAX_PLAIN_CHARS as NOTEPAD_MAX_LENGTH } from "../../lib/profileNotepadContent";
export { notepadStatsFromContent as notepadStats } from "../../lib/profileNotepadContent";

export const NOTEPAD_PLACEHOLDER =
  "Начните с цели ретро или нажмите «План» — шаблон подставится в курсор. Tab — вложенность списков.";

export type NotepadSnippet = {
  id: string;
  label: string;
  icon: string;
  text: string;
  /** HTML для TipTap; если нет — из text */
  html?: string;
};

export const NOTEPAD_SNIPPETS: NotepadSnippet[] = [
  {
    id: "goal",
    label: "Цель",
    icon: "🎯",
    text: "Цель ретро:\n— \n",
    html: "<p><strong>Цель ретро:</strong></p><ul><li><p></p></li></ul>",
  },
  {
    id: "agenda",
    label: "План",
    icon: "📋",
    text: "План сессии (45 мин):\n1. Check-in — 5 мин\n2. Сбор — 15 мин\n3. Голосование — 5 мин\n4. Обсуждение — 15 мин\n5. Action items — 5 мин\n",
    html: "<p><strong>План сессии (45 мин):</strong></p><ol><li><p>Check-in — 5 мин</p></li><li><p>Сбор — 15 мин</p></li><li><p>Голосование — 5 мин</p></li><li><p>Обсуждение — 15 мин</p></li><li><p>Action items — 5 мин</p></li></ol>",
  },
  {
    id: "links",
    label: "Ссылки",
    icon: "🔗",
    text: "Ссылки:\n• Доска: \n• Confluence / Wiki: \n• Запись встречи: \n",
    html: "<p><strong>Ссылки:</strong></p><ul><li><p>Доска: </p></li><li><p>Confluence / Wiki: </p></li><li><p>Запись встречи: </p></li></ul>",
  },
  {
    id: "actions",
    label: "Actions",
    icon: "✅",
    text: "Action items:\n• [ ] \n• [ ] \n• [ ] \n",
    html: "<p><strong>Action items:</strong></p><ul><li><p>[ ] </p></li><li><p>[ ] </p></li><li><p>[ ] </p></li></ul>",
  },
  {
    id: "table",
    label: "Таблица",
    icon: "📊",
    text: "Тема\tКомментарий\n\t\n",
    html: "<table><tbody><tr><th><p>Тема</p></th><th><p>Комментарий</p></th><th><p>Голоса</p></th></tr><tr><td><p></p></td><td><p></p></td><td><p></p></td></tr><tr><td><p></p></td><td><p></p></td><td><p></p></td></tr></tbody></table>",
  },
  {
    id: "parking",
    label: "Парковка",
    icon: "🅿️",
    text: "Парковка тем (вне ретро):\n• \n",
    html: "<p><strong>Парковка тем (вне ретро):</strong></p><ul><li><p></p></li></ul>",
  },
  {
    id: "retro",
    label: "Шаблон",
    icon: "📝",
    text: "Спринт: \n\nПлюсы:\n• \n\nМинусы:\n• \n\nДействия:\n• \n",
    html: "<p><strong>Спринт:</strong> </p><p><strong>Плюсы:</strong></p><ul><li><p></p></li></ul><p><strong>Минусы:</strong></p><ul><li><p></p></li></ul><p><strong>Действия:</strong></p><ul><li><p></p></li></ul>",
  },
];
