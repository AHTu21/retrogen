export type ThemeBlockCopy = {
  title: string;
  subtitle?: string;
  warmupOptions?: { id: string; label: string; hint?: string }[];
  rateScale?: number;
};

export type ThemePack = {
  seedTheme: string;
  palette: { bg: string; surface: string; accent: string };
  blocks: Record<string, ThemeBlockCopy>;
};

/** Краткая карточка комнаты для лобби и сокета `lobby:patch` */
export type LobbyRoomDto = {
  slug: string;
  themeSanitized: string;
  status: string;
  createdAt: string;
  endedAt: string | null;
  stickerCount: number;
};

/** Общие поля гаджета на плоскости. */
export type BoardGadgetBaseDto = {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  layerZ?: number;
};

/** Таймер на плоскости. */
export type BoardGadgetTimerDto = BoardGadgetBaseDto & {
  kind: "timer";
  /** Время окончания по `Date.now()` */
  endsAtMs: number;
  label?: string;
};

/** Случайный выбор участника (имена из авторов стикеров + гость). */
export type BoardGadgetRandomPickDto = BoardGadgetBaseDto & {
  kind: "randomPick";
  pickedName?: string;
  pickedAtMs?: number;
};

/** Короткий опрос (1 вопрос, 2–3 варианта). */
export type BoardGadgetPollDto = BoardGadgetBaseDto & {
  kind: "poll";
  question: string;
  options: [string, string] | [string, string, string];
  /** voterKey → индекс варианта */
  votes?: Record<string, number>;
};

/** Встраиваемый iframe (URL из allowlist). */
export type BoardGadgetEmbedDto = BoardGadgetBaseDto & {
  kind: "embed";
  url: string;
  title?: string;
};

export type BoardGadgetDto =
  | BoardGadgetTimerDto
  | BoardGadgetRandomPickDto
  | BoardGadgetPollDto
  | BoardGadgetEmbedDto;

/** Нормализованная обрезка картинки (доли 0–1 от натурального размера). */
export type MemeCropDto = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Простая фигура схемы на плоскости (рамка и далее типы). */
export type PlaneShapeDto = {
  id: string;
  kind: "frame";
  x: number;
  y: number;
  width: number;
  height: number;
  stroke?: string;
  fill?: string;
  label?: string;
  layerZ?: number;
};

/** Состояние плоскости доски (зум, раскладки, мемы) — синхронизируется с сервером */
export type PlaneStateDto = {
  boardScale: number;
  boardOffset: { x: number; y: number };
  blockLayouts: Record<string, { x: number; y: number; width: number; height: number }>;
  cardLayouts: Record<string, { x: number; y: number; width: number; height: number }>;
  blockMeta: Record<string, { locked: boolean; z: number }>;
  cardMeta: Record<string, { locked: boolean; z: number }>;
  memes: Array<{
    id: string;
    src: string;
    x: number;
    y: number;
    width: number;
    height: number;
    caption?: string;
    /** Угол поворота изображения по часовой стрелке, градусы */
    rotation?: number;
    crop?: MemeCropDto;
  }>;
  /** Опционально: таймеры и др.; старые снимки без поля считаются пустым списком */
  gadgets?: BoardGadgetDto[];
  /** Цвет подложки стикера (RGBA/hex CSS) по id карточки */
  cardStyles?: Record<string, { backgroundColor?: string }>;
  /** Цвет фона блока по id блока */
  blockStyles?: Record<string, { backgroundColor?: string }>;
  planeShapes?: PlaneShapeDto[];
  /** Теги по id карточки (planeState, без миграции БД) */
  cardTags?: Record<string, string[]>;
  /** Линии между стикерами на плоскости */
  connections?: Array<{
    id: string;
    fromCardId: string;
    toCardId: string;
    label?: string;
    stroke?: string;
  }>;
};

export type RoomDto = {
  id: string;
  slug: string;
  /** retro | empty — задаётся при создании. */
  kind?: string;
  /** Комната привязана к аккаунту создателя — сброс/завершение только с правами фасилитатора. */
  hasOwner?: boolean;
  /** С правами текущего браузера (Bearer); может отсутствовать в payload сокета — тогда держим предыдущее значение. */
  acl?: { facilitate: boolean };
  /** Показывать ли комнату в общем лобби (поиск на главной). */
  listedInLobby?: boolean;
  /** На сервере задан пароль для входа в комнату (гости вводят пароль или токен после unlock). */
  hasJoinPassword?: boolean;
  status: string;
  endedAt: string | null;
  themeRaw: string;
  themeSanitized: string;
  themePack: ThemePack;
  createdAt: string;
  planeState: unknown | null;
  planeVersion: number;
  actionItems: Array<{ id: string; text: string; sortOrder: number; createdAt: string }>;
  blocks: {
    id: string;
    kind: string;
    sortOrder: number;
    gridColumns: number;
    cardCount: number;
  }[];
  cards: {
    id: string;
    blockId: string;
    text: string;
    /** TipTap JSON; null — только HTML в `text` (старые карточки). */
    textDoc?: unknown | null;
    anonymous: boolean;
    authorDisplayName: string | null;
    row: number;
    col: number;
    createdAt: string;
    updatedAt: string;
  }[];
  sprintStarEntries: {
    id: string;
    name: string;
    photoUrl: string | null;
    note: string | null;
    starCount: number;
    createdAt: string;
    updatedAt: string;
  }[];
  sprintStarVotes: {
    id: string;
    entryId: string;
    voterKey: string;
    createdAt: string;
  }[];
  retroRatings: {
    id: string;
    voterKey: string;
    score: number;
    createdAt: string;
    updatedAt: string;
  }[];
  retroOneThings: {
    id: string;
    voterKey: string;
    text: string;
    createdAt: string;
    updatedAt: string;
  }[];
  warmupVotes: {
    id: string;
    optionId: string;
    voterKey: string;
    voterName: string;
    createdAt: string;
    updatedAt: string;
  }[];
  cardReactions: Array<{
    id: string;
    cardId: string;
    voterKey: string;
    emoji: string;
    createdAt: string;
  }>;
};
