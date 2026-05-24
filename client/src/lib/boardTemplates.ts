/** Встроенные шаблоны текста для нового стикера (HTML для TipTap / Card.text). */

export type BoardStickerTemplate = {
  id: string;
  label: string;
  description?: string;
  html: string;
};

export const BOARD_STICKER_TEMPLATES: BoardStickerTemplate[] = [
  {
    id: "retro-good",
    label: "Плюс спринта",
    html: "<p><b>Что пошло хорошо</b></p><ul><li>…</li><li></li></ul>",
  },
  {
    id: "retro-bad",
    label: "Минус / риски",
    html: "<p><b>Что мешало / риски</b></p><ul><li>…</li><li></li></ul>",
  },
  {
    id: "action",
    label: "Action item",
    html: "<p><b>Действие</b>: … </p><p><i>Владелец:</i> <i>Срок:</i></p>",
  },
  {
    id: "kudos",
    label: "Благодарность",
    html: "<p><b>Спасибо</b> @команде за …</p>",
  },
  {
    id: "idea",
    label: "Идея на спринт",
    html: "<p><b>Идея</b>: …</p><p><i>Гипотеза:</i></p><p><i>Как проверить:</i></p>",
  },
];

/** Рамки схемы: координаты задаются относительно центра видимой области плоскости (ox вправо, oy вниз). */
export type BoardSchemeFrameDef = {
  ox: number;
  oy: number;
  width: number;
  height: number;
  stroke?: string;
  fill?: string;
  label?: string;
};

export type BoardSchemePreset = {
  id: string;
  label: string;
  description?: string;
  frames: BoardSchemeFrameDef[];
};

export const BOARD_SCHEME_PRESETS: BoardSchemePreset[] = [
  {
    id: "retro-three",
    label: "3 колонки",
    description: "Классическое good / bad / improve",
    frames: [
      {
        ox: -380,
        oy: -140,
        width: 240,
        height: 360,
        stroke: "#22c55e",
        fill: "rgba(34,197,94,0.06)",
        label: "Хорошо",
      },
      {
        ox: -120,
        oy: -140,
        width: 240,
        height: 360,
        stroke: "#ef4444",
        fill: "rgba(239,68,68,0.06)",
        label: "Плохо",
      },
      {
        ox: 140,
        oy: -140,
        width: 240,
        height: 360,
        stroke: "#3b82f6",
        fill: "rgba(59,130,246,0.06)",
        label: "Идеи",
      },
    ],
  },
  {
    id: "timeline",
    label: "Таймлайн",
    description: "Три этапа подряд",
    frames: [
      { ox: -400, oy: -100, width: 240, height: 280, stroke: "#64748b", fill: "rgba(248,250,252,0.06)", label: "Начало" },
      { ox: -120, oy: -100, width: 240, height: 280, stroke: "#64748b", fill: "rgba(248,250,252,0.06)", label: "Середина" },
      { ox: 160, oy: -100, width: 240, height: 280, stroke: "#64748b", fill: "rgba(248,250,252,0.06)", label: "Финиш" },
    ],
  },
  {
    id: "double-box",
    label: "Факты / мнения",
    frames: [
      { ox: -320, oy: -120, width: 300, height: 320, stroke: "#a855f7", fill: "rgba(168,85,247,0.07)", label: "Факты" },
      { ox: 20, oy: -120, width: 300, height: 320, stroke: "#f97316", fill: "rgba(249,115,22,0.07)", label: "Мнения" },
    ],
  },
];
