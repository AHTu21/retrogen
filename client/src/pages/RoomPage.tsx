import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Socket } from "socket.io-client";
import {
  createBlock,
  createCard,
  deleteBlock,
  deleteCard,
  endRetro,
  fetchAuthMe,
  fetchRoom,
  logoutAccount,
  patchRoomAccess,
  patchPlaneState,
  resetRoom,
  toggleCardReaction,
  updateCard,
  upsertRetroRating,
  upsertWarmupVote,
  voteSprintStarEntry,
  type AuthUserDto,
} from "../api";
import type { BoardGadgetDto, PlaneShapeDto, PlaneStateDto, RoomDto } from "../types";
import { BOARD_SCHEME_PRESETS, BOARD_STICKER_TEMPLATES } from "../lib/boardTemplates";
import { maxLayerZ, minLayerZ } from "../lib/layerZ";
import { cursorCss, loadProfilePrefs, type UserProfilePrefs } from "../lib/profilePrefs";
import { contrastRatio } from "../lib/colorContrast";
import { STICKER_QUICK_EMOJI } from "../lib/stickerEmojiPresets";
import {
  cssColorToHex,
  DEFAULT_STICKER_SURFACE_HEX,
  expandEmojiShortcodesInHtml,
  loadRecentStickerEmojis,
  mergeEmojiPalette,
  rememberStickerEmoji,
} from "../lib/stickerEditorExtras";
import {
  mergeStickerTableCellDown,
  mergeStickerTableCellRight,
  splitStickerTableCellHorizontal,
  splitStickerTableCellVertical,
} from "../lib/stickerTableCells";
import { exportStickerCardToPng } from "../lib/stickerPngExport";
import { StickerConnectionsLayer } from "../components/StickerConnectionsLayer";
import { StickerTipTapFieldLazy } from "../components/StickerTipTapFieldLazy";
import type { StickerEditorApi } from "../lib/stickerTipTap/api";
import { stickerCollabUserColor, stickerCollabUserLabel } from "../lib/stickerCollab/collabUser";
import { useStickerCollab } from "../lib/stickerCollab/useStickerCollab";
import { stickerCardEditorContent } from "../lib/stickerTextDoc";
import {
  buildMentionCandidatesFromRoom,
  cardHtmlMentionsMe,
  currentActorDisplayName,
  currentActorMentionIds,
  filterMentionCandidates,
  getMentionAutocompleteAtCaret,
  type MentionCandidate,
} from "../lib/stickerMentions";
import { insertStickerTipTapMention } from "../lib/stickerTipTap/mentionInsert";
import {
  formatStickerTagsForInput,
  parseStickerTagInput,
} from "../lib/stickerTags";
import { newStickerConnectionId, parsePlaneConnections, type StickerConnection } from "../lib/stickerConnections";
import { planeStateFingerprint } from "../lib/planeFingerprint";
import { mergePlaneFor409Retry } from "../lib/mergePlane409";
import { boardPointFromClient, boardViewportCenterWorld, worldSizeFromCssPixels } from "../lib/boardPlaneCoords";
import { tryEmitPlaneLivePreview } from "../lib/planeLivePreview";
import { createAppSocket } from "../lib/socketClient";
import { getRoomUnlockToken } from "../lib/roomUnlockStorage";
import { recordRoomVisit } from "../lib/roomLobbyPrefs";
import {
  readRoomRolePreviewMode,
  writeRoomRolePreviewMode,
  type RoomRolePreviewMode,
} from "../lib/roomRolePreview";
import { useAppCorners, useAppTheme } from "../theme";
import { RoomPasswordGate } from "../components/RoomPasswordGate";
import { RetrogenDockableAbout } from "../components/RetrogenDockableAbout";
import { RetrogenOverflowMenu } from "../components/RetrogenOverflowMenu";
import { ThemeCornersIconButtons } from "../components/ThemeCornersIconButtons";

const GUEST_NAME_KEY = "retrogen_guest_name";
const PARTICIPANT_KEY = "retrogen_participant_key";
const MEMES_KEY_PREFIX = "retrogen_memes";
const BOARD_LAYOUT_KEY_PREFIX = "retrogen_board_layout_v2";
const CARD_LAYOUT_KEY_PREFIX = "retrogen_card_layout";
const BOARD_VIEW_KEY_PREFIX = "retrogen_board_view_v1";
const LEFT_MENU_POS_KEY_PREFIX = "retrogen_left_menu_pos_v1";
const BOARD_WIDTH = 32000;
const BOARD_HEIGHT = 24000;
const DEFAULT_BOARD_SCALE = 1;
const DEFAULT_BOARD_OFFSET = { x: 80, y: 80 };
const FREE_CANVAS_BLOCK_KIND = "freeCanvas";
const CARD_REACTION_PRESETS = ["👍", "👎", "❤️", "🔥", "😂", "✅"] as const;
const ENDED_WELCOME_DISMISS_KEY_PREFIX = "retrogen_ended_welcome_dismissed_";
/** Реже шлём PATCH плоскости: меньше HTTP при серии мелких движений; дубликаты всё равно отсекаются по fingerprint. */
const PLANE_SAVE_DEBOUNCE_MS = 1600;

type MemeItem = {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  caption?: string;
  rotation?: number;
};

type MemeDragState = {
  memeId: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  startWidth: number;
  startHeight: number;
};

type BlockLayout = { x: number; y: number; width: number; height: number };
type CardLayout = { x: number; y: number; width: number; height: number };
type PanState = { startX: number; startY: number; startOffsetX: number; startOffsetY: number };
type DragEntityState = {
  kind: "block" | "card";
  id: string;
  blockId?: string;
  mode: "move" | "resize";
  corner?: "nw" | "ne" | "sw" | "se";
  moved?: boolean;
  activateEditOnClick?: boolean;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  startWidth: number;
  startHeight: number;
};

type VerticalAlign = "top" | "middle" | "bottom";
type EntityMeta = { locked: boolean; z: number };
type ContextMenuState =
  | { kind: "block"; id: string; x: number; y: number; mode: "menu" | "pickBg" }
  | { kind: "card"; id: string; x: number; y: number; mode: "menu" | "pickBg" }
  | null;
type HelpDragState = { startX: number; startY: number; startLeft: number; startTop: number } | null;
type BoardViewSnapshot = {
  boardScale: number;
  boardOffset: { x: number; y: number };
  blockLayouts: Record<string, BlockLayout>;
  cardLayouts: Record<string, CardLayout>;
  memes: MemeItem[];
  gadgets: BoardGadgetDto[];
  cardStyles: Record<string, { backgroundColor?: string }>;
  blockStyles: Record<string, { backgroundColor?: string }>;
  planeShapes: PlaneShapeDto[];
};

type GadgetDragState = {
  gadgetId: string;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
};

type ShapeDragState = {
  shapeId: string;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
};

const BG_PICKER_PRESETS = [
  { label: "Сброс", value: "" },
  { label: "Белый", value: "#ffffff" },
  { label: "Лимон", value: "#fef9c3" },
  { label: "Мята", value: "#d1fae5" },
  { label: "Небо", value: "#e0f2fe" },
  { label: "Роза", value: "#fce7f3" },
  { label: "Тёмн.", value: "#1e293b" },
] as const;

function normalizeMemeEntry(raw: unknown): MemeItem | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.id !== "string" || typeof m.src !== "string") return null;
  const x = Number(m.x),
    y = Number(m.y),
    w = Number(m.width),
    h = Number(m.height);
  if (![x, y, w, h].every((n) => Number.isFinite(n))) return null;
  let rot = typeof m.rotation === "number" && Number.isFinite(m.rotation) ? m.rotation : 0;
  rot = ((((rot % 360) + 360) % 360) / 90) * 90;
  return {
    id: m.id,
    src: m.src,
    x,
    y,
    width: Math.max(40, w),
    height: Math.max(40, h),
    caption: typeof m.caption === "string" ? m.caption : undefined,
    rotation: rot,
  };
}

function normalizeGadgetList(raw: unknown): BoardGadgetDto[] {
  if (!Array.isArray(raw)) return [];
  const out: BoardGadgetDto[] = [];
  for (const g of raw) {
    if (!g || typeof g !== "object") continue;
    const o = g as Record<string, unknown>;
    if (o.kind !== "timer") continue;
    if (typeof o.id !== "string") continue;
    const x = Number(o.x),
      y = Number(o.y),
      ends = Number(o.endsAtMs);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(ends)) continue;
    const layerZ =
      typeof o.layerZ === "number" && Number.isFinite(o.layerZ) ? o.layerZ : 320 + out.length;
    out.push({
      id: o.id,
      kind: "timer",
      x,
      y,
      endsAtMs: ends,
      label: typeof o.label === "string" ? o.label : undefined,
      layerZ,
    });
  }
  return out;
}

function normalizePlaneShapesList(raw: unknown): PlaneShapeDto[] {
  if (!Array.isArray(raw)) return [];
  const out: PlaneShapeDto[] = [];
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i];
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    if (o.kind !== "frame") continue;
    if (typeof o.id !== "string") continue;
    const x = Number(o.x),
      y = Number(o.y),
      w = Number(o.width),
      h = Number(o.height);
    if (![x, y, w, h].every((n) => Number.isFinite(n))) continue;
    const layerZ =
      typeof o.layerZ === "number" && Number.isFinite(o.layerZ) ? o.layerZ : 56 + i;
    out.push({
      id: o.id,
      kind: "frame",
      x,
      y,
      width: Math.max(40, w),
      height: Math.max(40, h),
      stroke: typeof o.stroke === "string" ? o.stroke : "#64748b",
      fill: typeof o.fill === "string" ? o.fill : "transparent",
      label: typeof o.label === "string" ? o.label : undefined,
      layerZ,
    });
  }
  return out;
}

function formatGadgetCountdown(endsAtMs: number, now: number): string {
  const msLeft = endsAtMs - now;
  if (msLeft <= 0) return "0:00";
  const secTotal = Math.floor(msLeft / 1000);
  const h = Math.floor(secTotal / 3600);
  const m = Math.floor((secTotal % 3600) / 60);
  const s = secTotal % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const MIN_BLOCK_WIDTH = 80;
const MIN_BLOCK_HEIGHT = 56;
const MIN_CARD_WIDTH = 28;
const MIN_CARD_HEIGHT = 20;

function computeNextBlockLayoutForDrag(drag: DragEntityState, cur: BlockLayout, dx: number, dy: number): BlockLayout {
  if (drag.mode === "move") {
    return { ...cur, x: drag.startLeft + dx, y: drag.startTop + dy };
  }
  const minWidth = MIN_BLOCK_WIDTH;
  const minHeight = MIN_BLOCK_HEIGHT;
  const ratio = drag.startWidth / drag.startHeight;
  const xSign = drag.corner === "nw" || drag.corner === "sw" ? -1 : 1;
  const ySign = drag.corner === "nw" || drag.corner === "ne" ? -1 : 1;
  const rx = xSign * dx;
  const ry = ySign * dy;
  const scale = Math.max((drag.startWidth + rx) / drag.startWidth, (drag.startHeight + ry) / drag.startHeight);
  const minWidthByRatio = minHeight * ratio;
  const nextWidth = Math.max(minWidth, minWidthByRatio, drag.startWidth * scale);
  const nextHeight = nextWidth / ratio;
  const nextLeft =
    drag.corner === "nw" || drag.corner === "sw" ? drag.startLeft + (drag.startWidth - nextWidth) : drag.startLeft;
  const nextTop =
    drag.corner === "nw" || drag.corner === "ne" ? drag.startTop + (drag.startHeight - nextHeight) : drag.startTop;
  return { ...cur, x: nextLeft, y: nextTop, width: nextWidth, height: nextHeight };
}

function computeNextCardLayoutForDrag(drag: DragEntityState, cur: CardLayout, dx: number, dy: number): CardLayout {
  if (drag.mode === "move") {
    return { ...cur, x: drag.startLeft + dx, y: drag.startTop + dy };
  }
  const minWidth = MIN_CARD_WIDTH;
  const minHeight = MIN_CARD_HEIGHT;
  const ratio = drag.startWidth / drag.startHeight;
  const xSign = drag.corner === "nw" || drag.corner === "sw" ? -1 : 1;
  const ySign = drag.corner === "nw" || drag.corner === "ne" ? -1 : 1;
  const rx = xSign * dx;
  const ry = ySign * dy;
  const scale = Math.max((drag.startWidth + rx) / drag.startWidth, (drag.startHeight + ry) / drag.startHeight);
  const minWidthByRatio = minHeight * ratio;
  const nextWidth = Math.max(minWidth, minWidthByRatio, drag.startWidth * scale);
  const nextHeight = nextWidth / ratio;
  const nextLeft =
    drag.corner === "nw" || drag.corner === "sw" ? drag.startLeft + (drag.startWidth - nextWidth) : drag.startLeft;
  const nextTop =
    drag.corner === "nw" || drag.corner === "ne" ? drag.startTop + (drag.startHeight - nextHeight) : drag.startTop;
  return { ...cur, x: nextLeft, y: nextTop, width: nextWidth, height: nextHeight };
}

const DEFAULT_CARD_WIDTH = 120;
const DEFAULT_CARD_HEIGHT = 80;
/** Предупреждение о размере HTML в стикере (символы `innerHTML`). */
const STICKER_HTML_WARN_CHARS = 120_000;
/** Жёсткий предел вставки и роста черновика. */
const STICKER_HTML_MAX_CHARS = 600_000;

function normalizeStickerHttpUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t, /^https?:\/\//i.test(t) ? undefined : "https://");
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch {
    return null;
  }
  return null;
}

function htmlToMarkdownLite(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstChild as HTMLElement | null;
  if (!root) return "";
  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(walk).join("");
    switch (tag) {
      case "br":
        return "\n";
      case "div":
        return `${inner}\n`;
      case "p":
        return `${inner}\n\n`;
      case "strong":
      case "b":
        return inner ? `**${inner}**` : "";
      case "em":
      case "i":
        return inner ? `*${inner}*` : "";
      case "s":
      case "strike":
      case "del":
        return inner ? `~~${inner}~~` : "";
      case "code":
        return inner ? `\`${inner}\`` : "";
      case "a": {
        const href = el.getAttribute("href") ?? "";
        return `[${inner}](${href})`;
      }
      case "li":
        return `- ${inner.trim()}\n`;
      case "ul":
      case "ol":
        return `${inner}\n`;
      case "blockquote":
        return `${inner
          .trim()
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n")}\n\n`;
      case "tr":
        return `${inner}\n`;
      case "td":
      case "th":
        return `${inner} | `;
      case "table":
        return `${inner}\n`;
      case "h1":
        return `# ${inner}\n\n`;
      case "h2":
        return `## ${inner}\n\n`;
      case "hr":
        return "---\n";
      default:
        return inner;
    }
  }
  return walk(root)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getGuestName(): string {
  try {
    const v = localStorage.getItem(GUEST_NAME_KEY);
    if (v && v.trim()) return v.trim();
  } catch {
    /* ignore */
  }
  return "";
}

function getOrCreateParticipantKey(): string {
  try {
    const existing = localStorage.getItem(PARTICIPANT_KEY);
    if (existing && existing.trim()) return existing;
    const created = `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(PARTICIPANT_KEY, created);
    return created;
  } catch {
    return `volatile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

function sortCards(cards: RoomDto["cards"]) {
  return [...cards].sort((a, b) => a.row - b.row || a.col - b.col || a.createdAt.localeCompare(b.createdAt));
}

function normalizeName(s: string): string {
  return s.trim().toLocaleLowerCase();
}

function describeSprintStarActivity(room: RoomDto, entry: RoomDto["sprintStarEntries"][number]) {
  const blockKindById = new Map(room.blocks.map((b) => [b.id, b.kind]));
  const cardsByAuthor = room.cards.filter((c) => normalizeName(c.authorDisplayName ?? "") === normalizeName(entry.name));
  const total = cardsByAuthor.length;
  const countByKind = new Map<string, number>();
  for (const c of cardsByAuthor) {
    const kind = blockKindById.get(c.blockId) ?? "other";
    countByKind.set(kind, (countByKind.get(kind) ?? 0) + 1);
  }
  const good = countByKind.get("good") ?? 0;
  const bad = countByKind.get("bad") ?? 0;
  const improve = countByKind.get("improve") ?? 0;
  const actions = countByKind.get("actions") ?? 0;

  let role = "Сбалансированный участник";
  let summary = "Равномерно участвует в обсуждении ретро.";
  if (good >= 3 && good >= bad && good >= improve) {
    role = "Оптимист";
    summary = "Чаще отмечает, что сработало хорошо и поддерживает командный тон.";
  } else if (bad >= 3 && bad > good) {
    role = "Риск-радар";
    summary = "Сильно подсвечивает проблемные зоны и помогает увидеть узкие места.";
  } else if (improve + actions >= 3) {
    role = "Улучшатор процесса";
    summary = "Чаще фокусируется на изменениях и конкретных шагах на следующий спринт.";
  } else if (total <= 1) {
    role = "Тихий наблюдатель";
    summary = "Редко пишет стикеры, но может давать точечные ценные сигналы.";
  }

  return `${role}. ${summary}`;
}

function sprintStarVisual(starCount: number) {
  if (starCount <= 0) {
    return { symbol: "☆", color: "#ffffff", sizePx: 28 };
  }
  return {
    symbol: "★",
    color: "#facc15",
    sizePx: Math.min(28 + starCount * 6, 72),
  };
}

function getBaseBlockSize(kind: string): { width: number; height: number } {
  if (kind === "good" || kind === "bad" || kind === "improve") {
    return { width: 760, height: 620 };
  }
  if (kind === "sprintStar") {
    return { width: 760, height: 520 };
  }
  if (kind === "warmup") {
    return { width: 760, height: 440 };
  }
  return { width: 700, height: 440 };
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function RoomPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { themeMode, toggleTheme } = useAppTheme();
  const { cornerMode, toggleCorners } = useAppCorners();
  const isLight = themeMode === "light";
  const isRounded = cornerMode === "rounded";
  const [room, setRoom] = useState<RoomDto | null>(null);
  const latestRoomRef = useRef<RoomDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roomPasswordRequired, setRoomPasswordRequired] = useState(false);
  const [unlockRevision, setUnlockRevision] = useState(0);
  const [facAccessOpen, setFacAccessOpen] = useState(false);
  const [facListed, setFacListed] = useState(true);
  const [facNewPw, setFacNewPw] = useState("");
  const [facClearPw, setFacClearPw] = useState(false);
  const [facSaving, setFacSaving] = useState(false);
  const [facMsg, setFacMsg] = useState<string | null>(null);
  const [guestName, setGuestNameState] = useState("");
  const [editDrafts, setEditDrafts] = useState<Record<string, string>>({});
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [stickerEditorMono, setStickerEditorMono] = useState(false);
  const [stickerEditorBreakAll, setStickerEditorBreakAll] = useState(false);
  const [stickerEditorLineHeight, setStickerEditorLineHeight] = useState(1.25);
  const [stickerEditorPaddingPx, setStickerEditorPaddingPx] = useState(4);
  /** Интервал между абзацами: 0 — по умолчанию, 1 — средний, 2 — широкий */
  const [stickerEditorParaGap, setStickerEditorParaGap] = useState<0 | 1 | 2>(0);
  const [stickerSaveNotice, setStickerSaveNotice] = useState<string | null>(null);
  const stickerSaveNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  /** Не полагаться на `socket.connected` в useMemo: ссылка на `socket` не меняется при connect. */
  const [socketSessionLive, setSocketSessionLive] = useState(false);
  const [socketConnectError, setSocketConnectError] = useState<string | null>(null);
  const [socketSlowHint, setSocketSlowHint] = useState(false);
  const [rolePreviewMode, setRolePreviewMode] = useState<RoomRolePreviewMode>(() => readRoomRolePreviewMode());
  const [participantKey, setParticipantKey] = useState("");
  const [memes, setMemes] = useState<MemeItem[]>([]);
  const [gadgets, setGadgets] = useState<BoardGadgetDto[]>([]);
  const [planeShapes, setPlaneShapes] = useState<PlaneShapeDto[]>([]);
  const [cardStyles, setCardStyles] = useState<Record<string, { backgroundColor?: string }>>({});
  const [blockStyles, setBlockStyles] = useState<Record<string, { backgroundColor?: string }>>({});
  const [profileFx, setProfileFx] = useState<UserProfilePrefs>(() => loadProfilePrefs());
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [planeToolsOpen, setPlaneToolsOpen] = useState(false);
  const [selectedMemeId, setSelectedMemeId] = useState<string | null>(null);
  const [selectedGadgetId, setSelectedGadgetId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [boardScale, setBoardScale] = useState(DEFAULT_BOARD_SCALE);
  const [boardOffset, setBoardOffset] = useState(DEFAULT_BOARD_OFFSET);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [boardViewHydrated, setBoardViewHydrated] = useState(false);
  const [memesHydrated, setMemesHydrated] = useState(false);
  const [blockLayoutsHydrated, setBlockLayoutsHydrated] = useState(false);
  const [cardLayoutsHydrated, setCardLayoutsHydrated] = useState(false);
  const [blockLayouts, setBlockLayouts] = useState<Record<string, BlockLayout>>({});
  const [cardLayouts, setCardLayouts] = useState<Record<string, CardLayout>>({});
  const [cardTextAlign, setCardTextAlign] = useState<Record<string, "left" | "center" | "right">>({});
  const [cardVerticalAlign, setCardVerticalAlign] = useState<Record<string, VerticalAlign>>({});
  const [formatToolbarPos, setFormatToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [leftMenuPos, setLeftMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [blockMeta, setBlockMeta] = useState<Record<string, EntityMeta>>({});
  const [cardMeta, setCardMeta] = useState<Record<string, EntityMeta>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  /** Режим «стикер в руке»: клик — на плоскость (freeCanvas) или в зону стикеров блока (`data-sticker-drop-zone`). */
  const [pendingStickerPlacement, setPendingStickerPlacement] = useState(false);
  const [pendingStickerPos, setPendingStickerPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingBlockKind, setPendingBlockKind] = useState<string | null>(null);
  const [pendingBlockPos, setPendingBlockPos] = useState<{ x: number; y: number } | null>(null);
  const [viewHistoryPast, setViewHistoryPast] = useState<BoardViewSnapshot[]>([]);
  const [viewHistoryFuture, setViewHistoryFuture] = useState<BoardViewSnapshot[]>([]);
  const [helpMinimized, setHelpMinimized] = useState(true);
  /** Полноэкранный режим справки (кнопка «расширить»); по умолчанию — компактное окно. */
  const [helpExpanded, setHelpExpanded] = useState(false);
  /** Окно «О программе»: версия и CHANGELOG. */
  const [aboutOpen, setAboutOpen] = useState(false);
  const [authMe, setAuthMe] = useState<AuthUserDto | null>(null);
  /** Одноразовое приветствие после завершения ретро (можно скрыть и смотреть доску). */
  const [endedWelcomeOpen, setEndedWelcomeOpen] = useState(false);
  /** Диалог «поделиться» — позже: контакты, поиск, диалоги; пока только копирование ссылки. */
  const [shareRoomDialogOpen, setShareRoomDialogOpen] = useState(false);
  const [copyTipPlacement, setCopyTipPlacement] = useState<null | "header" | "dialog">(null);
  const copyTipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stickerEmojiOpen, setStickerEmojiOpen] = useState(false);
  const [stickerRecentEmojis, setStickerRecentEmojis] = useState<string[]>(() => loadRecentStickerEmojis());
  const [stickerLinkOpen, setStickerLinkOpen] = useState(false);
  const [stickerLinkHref, setStickerLinkHref] = useState("https://");
  const [cardTags, setCardTags] = useState<Record<string, string[]>>({});
  const [stickerConnections, setStickerConnections] = useState<StickerConnection[]>([]);
  const [mentionSuggest, setMentionSuggest] = useState<{ cardId: string; query: string; pick: number } | null>(
    null,
  );
  const [connectionDraftFrom, setConnectionDraftFrom] = useState<string | null>(null);
  const [connectionHoverCardId, setConnectionHoverCardId] = useState<string | null>(null);
  const [stickerFilterMine, setStickerFilterMine] = useState(false);
  const [stickerTagsDraft, setStickerTagsDraft] = useState("");
  const stickerLinkInputRef = useRef<HTMLInputElement | null>(null);
  const [toolbarForeColor, setToolbarForeColor] = useState("#0f172a");
  const [toolbarHlColor, setToolbarHlColor] = useState("#fef08a");
  const [boardNowTs, setBoardNowTs] = useState(() => Date.now());
  const [helpPos, setHelpPos] = useState({ x: 16, y: 12 });
  const memeDragRef = useRef<MemeDragState | null>(null);
  const gadgetDragRef = useRef<GadgetDragState | null>(null);
  const shapeDragRef = useRef<ShapeDragState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const dragRef = useRef<DragEntityState | null>(null);
  const boardViewportRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const editorRefs = useRef<Record<string, StickerEditorApi | null>>({});

  function stickerEditorDom(cardId: string): HTMLElement | null {
    return editorRefs.current[cardId]?.getDom() ?? null;
  }

  function syncEditDraftFromEditor(cardId: string) {
    const api = editorRefs.current[cardId];
    if (!api) return;
    setEditDrafts((prev) => ({ ...prev, [cardId]: api.getHtml() }));
  }

  const registerStickerEditor = useCallback((cardId: string, api: StickerEditorApi | null) => {
    editorRefs.current[cardId] = api;
  }, []);

  const handleStickerHtmlChange = useCallback((cardId: string, html: string) => {
    setEditDrafts((prev) => ({ ...prev, [cardId]: html }));
    const editor = editorRefs.current[cardId]?.getDom();
    if (!editor) {
      setMentionSuggest(null);
      return;
    }
    const ctx = getMentionAutocompleteAtCaret(editor);
    if (!ctx) {
      setMentionSuggest(null);
      return;
    }
    setMentionSuggest({ cardId, query: ctx.query, pick: 0 });
  }, []);
  type CopiedStickerStyle = {
    fontWeight: string;
    fontStyle: string;
    textDecoration: string;
    color: string;
    backgroundColor: string;
    fontFamily: string;
    fontSize: string;
  };
  const stickerFormatPaintRef = useRef<CopiedStickerStyle | null>(null);
  const helpDragRef = useRef<HelpDragState>(null);
  const toolbarDragRef = useRef<HelpDragState>(null);
  const applyingHistoryRef = useRef(false);
  const planeVersionRef = useRef(0);
  const planeHydratedRef = useRef<string | null>(null);
  /** Сериализация PATCH плоскости: иначе при медленной сети второй запрос уходит с тем же expectedVersion и ловит plane_conflict по кругу. */
  const planeSaveQueueRef = useRef(Promise.resolve());
  /** Последний снимок, совпадающий с сервером / последним успешным PATCH — не слать тот же JSON снова. */
  const planeLastPersistedFingerprintRef = useRef<string | null>(null);
  /** Throttle для `planeLive`: эфир превью без спама кадров. */
  const planeLiveThrottleUntilRef = useRef(0);
  /** После отпускания перетаскивания/ресайза сущности на плоскости — сразу поставить PATCH в очередь (0 ms debounce). */
  const planeDragEndedFlushRef = useRef(false);
  const [planeSaveBump, setPlaneSaveBump] = useState(0);
  const planeSnapshotRef = useRef({
    boardScale: DEFAULT_BOARD_SCALE,
    boardOffset: DEFAULT_BOARD_OFFSET,
    blockLayouts: {} as Record<string, BlockLayout>,
    cardLayouts: {} as Record<string, CardLayout>,
    blockMeta: {} as Record<string, EntityMeta>,
    cardMeta: {} as Record<string, EntityMeta>,
    memes: [] as MemeItem[],
    gadgets: [] as BoardGadgetDto[],
    cardStyles: {} as Record<string, { backgroundColor?: string }>,
    blockStyles: {} as Record<string, { backgroundColor?: string }>,
    planeShapes: [] as PlaneShapeDto[],
    cardTags: {} as Record<string, string[]>,
    connections: [] as StickerConnection[],
  });
  const suppressNextBoardClickRef = useRef(false);
  const lastBoardPointerWorldRef = useRef<{ x: number; y: number } | null>(null);
  const slugRef = useRef<string | undefined>(undefined);
  const memesRef = useRef(memes);
  const gadgetsRef = useRef(gadgets);
  const planeShapesRef = useRef(planeShapes);
  const boardScaleRef = useRef(boardScale);

  /** Не отправлять на сервер tmp-id и «висячие» раскладки — иначе первый стикер/блок теряется после PATCH. */
  function sanitizePlanePayloadForApi(rm: RoomDto, p: PlaneStateDto): PlaneStateDto {
    const blockIds = new Set(rm.blocks.map((b) => b.id));
    const cardIds = new Set(rm.cards.map((c) => c.id));

    const blockLayouts: Record<string, BlockLayout> = {};
    for (const [k, v] of Object.entries(p.blockLayouts)) {
      if (blockIds.has(k)) blockLayouts[k] = v;
    }
    const blockMeta: Record<string, EntityMeta> = {};
    for (const [k, v] of Object.entries(p.blockMeta)) {
      if (blockIds.has(k)) blockMeta[k] = v;
    }
    const cardLayouts: Record<string, CardLayout> = {};
    for (const [k, v] of Object.entries(p.cardLayouts)) {
      if (k.startsWith("tmp-")) continue;
      if (cardIds.has(k)) cardLayouts[k] = v;
    }
    const cardMeta: Record<string, EntityMeta> = {};
    for (const [k, v] of Object.entries(p.cardMeta)) {
      if (k.startsWith("tmp-")) continue;
      if (cardIds.has(k)) cardMeta[k] = v;
    }
    const nextTags: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(p.cardTags ?? {})) {
      if (cardIds.has(k) && Array.isArray(v) && v.length) nextTags[k] = v;
    }
    const nextConn = (p.connections ?? []).filter(
      (c) => cardIds.has(c.fromCardId) && cardIds.has(c.toCardId) && c.fromCardId !== c.toCardId,
    );
    return { ...p, blockLayouts, blockMeta, cardLayouts, cardMeta, cardTags: nextTags, connections: nextConn };
  }

  function planeSnapshotHasTmpKeys(s: typeof planeSnapshotRef.current): boolean {
    return (
      Object.keys(s.cardLayouts).some((k) => k.startsWith("tmp-")) ||
      Object.keys(s.cardMeta).some((k) => k.startsWith("tmp-"))
    );
  }

  function stickerUndo(cardId: string) {
    const api = editorRefs.current[cardId];
    if (!api?.undo()) return;
    syncEditDraftFromEditor(cardId);
  }

  function stickerRedo(cardId: string) {
    const api = editorRefs.current[cardId];
    if (!api?.redo()) return;
    syncEditDraftFromEditor(cardId);
  }

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const data = await fetchRoom(slug);
      setRoom(data);
      setLoadError(null);
      setRoomPasswordRequired(false);
    } catch (e) {
      if (e instanceof Error && e.message === "room_password_required") {
        setRoomPasswordRequired(true);
        setLoadError(null);
        return;
      }
      setLoadError("Комната не найдена");
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setRoomPasswordRequired(false);
  }, [slug]);

  useEffect(() => {
    planeHydratedRef.current = null;
    planeLastPersistedFingerprintRef.current = null;
  }, [slug]);

  useEffect(() => {
    latestRoomRef.current = room;
  }, [room]);

  useEffect(() => {
    void fetchAuthMe().then(setAuthMe);
  }, []);

  useEffect(() => {
    if (!room) return;
    recordRoomVisit({
      slug: room.slug,
      themeSanitized: room.themeSanitized,
      status: room.status,
    });
  }, [room?.slug, room?.themeSanitized, room?.status]);

  useEffect(() => {
    if (!room || room.status !== "ended" || !slug) {
      setEndedWelcomeOpen(false);
      return;
    }
    try {
      const dismissed = localStorage.getItem(`${ENDED_WELCOME_DISMISS_KEY_PREFIX}${slug}`);
      setEndedWelcomeOpen(!dismissed);
    } catch {
      setEndedWelcomeOpen(true);
    }
  }, [room?.status, room?.id, slug]);

  useEffect(() => {
    setGuestNameState(getGuestName());
    setParticipantKey(getOrCreateParticipantKey());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "retrogen_profile_v1") setProfileFx(loadProfilePrefs());
    };
    const onLocal = () => setProfileFx(loadProfilePrefs());
    window.addEventListener("storage", onStorage);
    window.addEventListener("retrogen-profile", onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("retrogen-profile", onLocal);
    };
  }, []);

  const themePack = room?.themePack;
  const boardFrozen = room?.status === "ended";
  const boardFrozenRef = useRef(boardFrozen);
  useEffect(() => {
    boardFrozenRef.current = boardFrozen;
  }, [boardFrozen]);

  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  slugRef.current = slug;
  memesRef.current = memes;
  gadgetsRef.current = gadgets;
  planeShapesRef.current = planeShapes;
  boardScaleRef.current = boardScale;

  const roomShareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, [slug, room?.slug]);

  const flashRoomLinkCopied = useCallback((placement: "header" | "dialog") => {
    if (copyTipTimerRef.current) clearTimeout(copyTipTimerRef.current);
    setCopyTipPlacement(placement);
    copyTipTimerRef.current = setTimeout(() => {
      setCopyTipPlacement(null);
      copyTipTimerRef.current = null;
    }, 2000);
  }, []);

  const copyRoomShareUrl = useCallback(
    async (placement: "header" | "dialog" = "header"): Promise<boolean> => {
      if (!roomShareUrl) return false;
      try {
        await navigator.clipboard.writeText(roomShareUrl);
        flashRoomLinkCopied(placement);
        return true;
      } catch {
        window.alert("Не удалось скопировать — выделите ссылку вручную.");
        return false;
      }
    },
    [roomShareUrl, flashRoomLinkCopied],
  );

  useEffect(() => {
    return () => {
      if (copyTipTimerRef.current) clearTimeout(copyTipTimerRef.current);
    };
  }, []);

  useEffect(() => {
    writeRoomRolePreviewMode(rolePreviewMode);
  }, [rolePreviewMode]);

  const roomSyncLine = useMemo(() => {
    if (!socket) {
      return {
        text: "Синхронизация — инициализация…",
        title: "Готовится канал обновлений с сервером.",
        tone: "pending" as const,
      };
    }
    if (socketSessionLive) {
      return {
        text: "Синхронизация — онлайн",
        title: "Обновления доски и действий участников приходят с сервера в реальном времени.",
        tone: "ok" as const,
      };
    }
    if (socket.active) {
      return {
        text: socketSlowHint ? "Синхронизация — долго без ответа…" : "Синхронизация — подключаемся…",
        title: socketSlowHint
          ? "Сервер не отвечает по WebSocket. Проверьте, что бэкенд запущен; в режиме разработки Vite должен проксировать /socket.io. Обновите страницу."
          : "Устанавливается соединение с сервером…",
        tone: "pending" as const,
      };
    }
    return {
      text: "Синхронизация — нет связи",
      title: socketConnectError ?? "Соединение с сервером отсутствует. Обновите страницу или проверьте сеть.",
      tone: "error" as const,
    };
  }, [socket, socketSessionLive, socketConnectError, socketSlowHint]);

  const serverCanFacilitate = useMemo(() => {
    if (!room) return true;
    if (!room.hasOwner) return true;
    return room.acl?.facilitate === true;
  }, [room]);

  const canFacilitate = useMemo(() => {
    if (rolePreviewMode === "force-facilitator") return true;
    if (rolePreviewMode === "force-member") return false;
    return serverCanFacilitate;
  }, [rolePreviewMode, serverCanFacilitate]);

  useEffect(() => {
    if (!room) return;
    setFacListed(room.listedInLobby !== false);
    setFacNewPw("");
    setFacClearPw(false);
    setFacMsg(null);
  }, [room?.slug, room?.listedInLobby, room?.hasJoinPassword]);

  const saveFacilitatorAccess = useCallback(async () => {
    if (!slug || !room) return;
    setFacSaving(true);
    setFacMsg(null);
    try {
      const body: { listedInLobby?: boolean; joinPassword?: string | null } = {};
      const prevListed = room.listedInLobby !== false;
      if (facListed !== prevListed) body.listedInLobby = facListed;
      if (facClearPw) body.joinPassword = null;
      else if (facNewPw.trim()) body.joinPassword = facNewPw.trim();
      if (Object.keys(body).length === 0) {
        setFacMsg("Нет изменений");
        return;
      }
      const next = await patchRoomAccess(slug, body);
      setRoom(next);
      setFacMsg("Сохранено");
      setUnlockRevision((x) => x + 1);
    } catch (e) {
      setFacMsg(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setFacSaving(false);
    }
  }, [slug, room, facListed, facClearPw, facNewPw]);

  const stickerToolbarContrast = useMemo(
    () => contrastRatio(toolbarForeColor, toolbarHlColor),
    [toolbarForeColor, toolbarHlColor],
  );

  const stickerEmojiPalette = useMemo(
    () => mergeEmojiPalette(stickerRecentEmojis, STICKER_QUICK_EMOJI),
    [stickerRecentEmojis],
  );

  const editingStickerBgHex = useMemo(() => {
    if (!editingCardId) return null;
    const custom = cssColorToHex(cardStyles[editingCardId]?.backgroundColor);
    if (custom) return custom;
    return isLight ? DEFAULT_STICKER_SURFACE_HEX.light : DEFAULT_STICKER_SURFACE_HEX.dark;
  }, [editingCardId, cardStyles, isLight]);

  const stickerTextOnBgContrast = useMemo(() => {
    if (!editingStickerBgHex) return null;
    return contrastRatio(toolbarForeColor, editingStickerBgHex);
  }, [toolbarForeColor, editingStickerBgHex]);

  const blocksSorted = useMemo(() => {
    if (!room) return [];
    return [...room.blocks]
      .filter((b) => b.kind !== "actions" && b.kind !== "memeBoard")
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [room]);

  const planeShapesSorted = useMemo(
    () => [...planeShapes].sort((a, b) => (a.layerZ ?? 56) - (b.layerZ ?? 56)),
    [planeShapes],
  );

  useEffect(() => {
    if (!room) return;
    setBlockLayouts((prev) => {
      const next = { ...prev };
      const visibleBlocks = [...room.blocks]
        .filter((b) => b.kind !== "actions" && b.kind !== "memeBoard")
        .sort((a, b) => a.sortOrder - b.sortOrder);
      visibleBlocks.forEach((b, index) => {
        if (!next[b.id]) {
          const base = getBaseBlockSize(b.kind);
          const GAP = 40;
          const LEFT_X = 40;
          const TOP_Y = 40;
          const warmupBase = getBaseBlockSize("warmup");
          const sprintBase = getBaseBlockSize("sprintStar");
          const rateBase = getBaseBlockSize("rateRetro");
          const rightX = LEFT_X + warmupBase.width + GAP;
          const leftAfterWarmupY = TOP_Y + warmupBase.height + GAP;
          const layoutByKind: Record<string, { x: number; y: number }> = {
            warmup: { x: LEFT_X, y: TOP_Y },
            good: { x: rightX, y: TOP_Y },
            bad: { x: rightX, y: TOP_Y + getBaseBlockSize("good").height + GAP },
            improve: {
              x: rightX,
              y: TOP_Y + getBaseBlockSize("good").height + GAP + getBaseBlockSize("bad").height + GAP,
            },
            sprintStar: { x: LEFT_X, y: leftAfterWarmupY },
            rateRetro: { x: LEFT_X, y: leftAfterWarmupY + sprintBase.height + GAP },
            oneThingNextRetro: { x: LEFT_X, y: leftAfterWarmupY + sprintBase.height + GAP + rateBase.height + GAP },
          };
          const fallback = { x: 40 + (index % 2) * 460, y: 40 + Math.floor(index / 2) * 320 };
          const pos = layoutByKind[b.kind] ?? fallback;
          next[b.id] = {
            x: pos.x,
            y: pos.y,
            width: base.width,
            height: base.height,
          };
        }
      });
      return next;
    });
  }, [room]);

  useEffect(() => {
    if (!room) return;
    setBlockMeta((prev) => {
      const next = { ...prev };
      room.blocks.forEach((b, index) => {
        if (!next[b.id]) next[b.id] = { locked: false, z: 10 + index };
      });
      return next;
    });
  }, [room]);

  useEffect(() => {
    if (!room) return;
    setCardMeta((prev) => {
      const next = { ...prev };
      room.cards.forEach((c, index) => {
        if (!next[c.id]) next[c.id] = { locked: false, z: 100 + index };
      });
      return next;
    });
  }, [room]);

  useEffect(() => {
    if (!room) return;
    setCardLayouts((prev) => {
      const next = { ...prev };
      room.cards.forEach((card) => {
        if (!next[card.id]) {
          next[card.id] = {
            x: 8 + card.col * 124,
            y: 8 + card.row * 86,
            width: DEFAULT_CARD_WIDTH,
            height: DEFAULT_CARD_HEIGHT,
          };
        }
      });
      return next;
    });
  }, [room]);

  useEffect(() => {
    if (!slug) return;
    setMemesHydrated(false);
    try {
      const raw = localStorage.getItem(`${MEMES_KEY_PREFIX}:${slug}`);
      if (!raw) {
        setMemes([]);
        setMemesHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as MemeItem[];
      setMemes(Array.isArray(parsed) ? parsed : []);
    } catch {
      setMemes([]);
    } finally {
      setMemesHydrated(true);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug || !memesHydrated) return;
    try {
      localStorage.setItem(`${MEMES_KEY_PREFIX}:${slug}`, JSON.stringify(memes));
    } catch {
      /* ignore */
    }
  }, [slug, memes, memesHydrated]);

  useEffect(() => {
    if (!slug) return;
    setBlockLayoutsHydrated(false);
    try {
      const raw = localStorage.getItem(`${BOARD_LAYOUT_KEY_PREFIX}:${slug}`);
      if (!raw) {
        setBlockLayoutsHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, BlockLayout>;
      setBlockLayouts(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      /* ignore */
    } finally {
      setBlockLayoutsHydrated(true);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug || !blockLayoutsHydrated) return;
    try {
      localStorage.setItem(`${BOARD_LAYOUT_KEY_PREFIX}:${slug}`, JSON.stringify(blockLayouts));
    } catch {
      /* ignore */
    }
  }, [slug, blockLayouts, blockLayoutsHydrated]);

  useEffect(() => {
    if (!slug) return;
    setCardLayoutsHydrated(false);
    try {
      const raw = localStorage.getItem(`${CARD_LAYOUT_KEY_PREFIX}:${slug}`);
      if (!raw) {
        setCardLayoutsHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, CardLayout>;
      setCardLayouts(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      /* ignore */
    } finally {
      setCardLayoutsHydrated(true);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug || !cardLayoutsHydrated) return;
    try {
      localStorage.setItem(`${CARD_LAYOUT_KEY_PREFIX}:${slug}`, JSON.stringify(cardLayouts));
    } catch {
      /* ignore */
    }
  }, [slug, cardLayouts, cardLayoutsHydrated]);

  useEffect(() => {
    if (!slug) return;
    setBoardViewHydrated(false);
    try {
      const raw = localStorage.getItem(`${BOARD_VIEW_KEY_PREFIX}:${slug}`);
      if (!raw) {
        setBoardScale(DEFAULT_BOARD_SCALE);
        setBoardOffset(DEFAULT_BOARD_OFFSET);
        setBoardViewHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as { scale?: number; offset?: { x?: number; y?: number } };
      const scale = typeof parsed.scale === "number" && Number.isFinite(parsed.scale) ? parsed.scale : DEFAULT_BOARD_SCALE;
      const x =
        typeof parsed.offset?.x === "number" && Number.isFinite(parsed.offset.x)
          ? parsed.offset.x
          : DEFAULT_BOARD_OFFSET.x;
      const y =
        typeof parsed.offset?.y === "number" && Number.isFinite(parsed.offset.y)
          ? parsed.offset.y
          : DEFAULT_BOARD_OFFSET.y;
      setBoardScale(scale);
      setBoardOffset({ x, y });
    } catch {
      setBoardScale(DEFAULT_BOARD_SCALE);
      setBoardOffset(DEFAULT_BOARD_OFFSET);
    } finally {
      setBoardViewHydrated(true);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug || !boardViewHydrated) return;
    try {
      localStorage.setItem(
        `${BOARD_VIEW_KEY_PREFIX}:${slug}`,
        JSON.stringify({ scale: boardScale, offset: boardOffset }),
      );
    } catch {
      /* ignore */
    }
  }, [slug, boardScale, boardOffset, boardViewHydrated]);

  const applyPlaneFromPayload = useCallback((ps: PlaneStateDto) => {
    if ("boardScale" in ps && typeof ps.boardScale === "number" && Number.isFinite(ps.boardScale)) {
      setBoardScale(ps.boardScale);
    }
    if (
      "boardOffset" in ps &&
      ps.boardOffset &&
      typeof ps.boardOffset.x === "number" &&
      typeof ps.boardOffset.y === "number" &&
      Number.isFinite(ps.boardOffset.x) &&
      Number.isFinite(ps.boardOffset.y)
    ) {
      setBoardOffset({ x: ps.boardOffset.x, y: ps.boardOffset.y });
    }
    if ("blockLayouts" in ps && ps.blockLayouts && typeof ps.blockLayouts === "object") {
      setBlockLayouts((prev) => ({ ...prev, ...ps.blockLayouts }));
    }
    if ("cardLayouts" in ps && ps.cardLayouts && typeof ps.cardLayouts === "object") {
      setCardLayouts((prev) => ({ ...prev, ...ps.cardLayouts }));
    }
    if ("blockMeta" in ps && ps.blockMeta && typeof ps.blockMeta === "object") {
      setBlockMeta((prev) => ({ ...prev, ...ps.blockMeta }));
    }
    if ("cardMeta" in ps && ps.cardMeta && typeof ps.cardMeta === "object") {
      setCardMeta((prev) => ({ ...prev, ...ps.cardMeta }));
    }
    if ("memes" in ps && Array.isArray(ps.memes)) {
      const incoming = ps.memes.map(normalizeMemeEntry).filter((m): m is MemeItem => m != null);
      setMemes((prev) => {
        if (incoming.length === 0 && prev.length > 0) return prev;
        if (incoming.length === 0) return [];
        const map = new Map(prev.map((m) => [m.id, m]));
        for (const m of incoming) map.set(m.id, m);
        return [...map.values()];
      });
    }
    if ("gadgets" in ps) {
      const incoming = normalizeGadgetList(Array.isArray(ps.gadgets) ? ps.gadgets : []);
      setGadgets((prev) => {
        if (incoming.length === 0 && prev.length > 0) return prev;
        if (incoming.length === 0) return [];
        const map = new Map(prev.map((g) => [g.id, g]));
        for (const g of incoming) map.set(g.id, g);
        return [...map.values()];
      });
    }
    if ("cardStyles" in ps) {
      if (ps.cardStyles && typeof ps.cardStyles === "object") setCardStyles((prev) => ({ ...prev, ...ps.cardStyles }));
      else setCardStyles({});
    }
    if ("blockStyles" in ps) {
      if (ps.blockStyles && typeof ps.blockStyles === "object") setBlockStyles((prev) => ({ ...prev, ...ps.blockStyles }));
      else setBlockStyles({});
    }
    if ("planeShapes" in ps) {
      const incoming = normalizePlaneShapesList(Array.isArray(ps.planeShapes) ? ps.planeShapes : []);
      setPlaneShapes((prev) => {
        if (incoming.length === 0 && prev.length > 0) return prev;
        if (incoming.length === 0) return [];
        const map = new Map(prev.map((s) => [s.id, s]));
        for (const s of incoming) map.set(s.id, s);
        return [...map.values()];
      });
    }
    if ("cardTags" in ps) {
      if (ps.cardTags && typeof ps.cardTags === "object") setCardTags((prev) => ({ ...prev, ...ps.cardTags }));
      else setCardTags({});
    }
    if ("connections" in ps) {
      const incoming = Array.isArray(ps.connections) ? parsePlaneConnections({ connections: ps.connections }) : [];
      setStickerConnections((prev) => {
        if (incoming.length === 0 && prev.length > 0) return prev;
        if (incoming.length === 0) return [];
        const map = new Map(prev.map((c) => [c.id, c]));
        for (const c of incoming) map.set(c.id, c);
        return [...map.values()];
      });
    }
  }, []);

  function syncPlaneSnapshotFromDto(p: PlaneStateDto) {
    planeSnapshotRef.current = {
      boardScale: p.boardScale,
      boardOffset: { ...p.boardOffset },
      blockLayouts: { ...p.blockLayouts },
      cardLayouts: { ...p.cardLayouts },
      blockMeta: { ...p.blockMeta },
      cardMeta: { ...p.cardMeta },
      memes: p.memes.map((m) => ({ ...m })),
      gadgets: (p.gadgets ?? []).map((g) => ({ ...g })),
      cardStyles: { ...(p.cardStyles ?? {}) },
      blockStyles: { ...(p.blockStyles ?? {}) },
      planeShapes: (p.planeShapes ?? []).map((s) => ({ ...s })),
      cardTags: { ...(p.cardTags ?? {}) },
      connections: (p.connections ?? []).map((c) => ({ ...c })),
    };
  }

  useEffect(() => {
    if (!room || !slug) return;
    planeVersionRef.current = room.planeVersion ?? 0;
    const raw = room.planeState;
    if (raw == null || typeof raw !== "object") return;
    const key = `${slug}:${room.planeVersion}`;
    if (planeHydratedRef.current === key) return;
    applyPlaneFromPayload(raw as PlaneStateDto);
    planeHydratedRef.current = key;
    planeLastPersistedFingerprintRef.current = planeStateFingerprint(raw as PlaneStateDto);
  }, [slug, room, room?.planeVersion, room?.planeState, applyPlaneFromPayload]);

  useEffect(() => {
    planeSnapshotRef.current = {
      boardScale,
      boardOffset,
      blockLayouts,
      cardLayouts,
      blockMeta,
      cardMeta,
      memes,
      gadgets,
      cardStyles,
      blockStyles,
      planeShapes,
      cardTags,
      connections: stickerConnections,
    };
  }, [
    boardScale,
    boardOffset,
    blockLayouts,
    cardLayouts,
    blockMeta,
    cardMeta,
    memes,
    gadgets,
    cardStyles,
    blockStyles,
    planeShapes,
    cardTags,
    stickerConnections,
  ]);

  useEffect(() => {
    if (!slug || !room || boardFrozen) return;
    if (!blockLayoutsHydrated || !cardLayoutsHydrated || !memesHydrated || !boardViewHydrated) return;
    const slugAtSchedule = slug;
    const flushAfterEntityDrag = planeDragEndedFlushRef.current;
    planeDragEndedFlushRef.current = false;
    const delayMs = flushAfterEntityDrag ? 0 : PLANE_SAVE_DEBOUNCE_MS;
    const timer = window.setTimeout(() => {
      planeSaveQueueRef.current = planeSaveQueueRef.current.then(async () => {
        const buildPayload = (): PlaneStateDto => {
          const s = planeSnapshotRef.current;
          return {
            boardScale: s.boardScale,
            boardOffset: s.boardOffset,
            blockLayouts: s.blockLayouts,
            cardLayouts: s.cardLayouts,
            blockMeta: s.blockMeta,
            cardMeta: s.cardMeta,
            memes: s.memes,
            gadgets: s.gadgets,
            cardStyles: s.cardStyles,
            blockStyles: s.blockStyles,
            planeShapes: s.planeShapes,
            cardTags: s.cardTags,
            connections: s.connections,
          };
        };

        let payload = buildPayload();
        const maxAttempts = 6;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const rmNow = latestRoomRef.current;
          if (!rmNow) return;
          if (rmNow.cards.some((c) => c.id.startsWith("tmp-"))) return;
          if (planeSnapshotHasTmpKeys(planeSnapshotRef.current)) return;

          payload = sanitizePlanePayloadForApi(rmNow, payload);

          if (attempt === 0) {
            const fp0 = planeStateFingerprint(payload);
            if (fp0 === planeLastPersistedFingerprintRef.current) return;
          }
          try {
            const r = await patchPlaneState(slugAtSchedule, {
              expectedVersion: planeVersionRef.current,
              state: payload,
            });
            planeVersionRef.current = r.planeVersion;
            planeLastPersistedFingerprintRef.current = planeStateFingerprint(r.planeState as PlaneStateDto);
            setRoom((prev) =>
              prev && prev.slug === slugAtSchedule
                ? { ...prev, planeVersion: r.planeVersion, planeState: r.planeState }
                : prev,
            );
            return;
          } catch (e: unknown) {
            if (!(e instanceof Error) || e.message !== "plane_conflict" || attempt >= maxAttempts - 1) {
              if (e instanceof Error && e.message !== "plane_conflict") console.error(e);
              return;
            }
            const ex = e as Error & { planeState?: unknown; planeVersion?: number };
            if (typeof ex.planeVersion !== "number") return;
            const ver = ex.planeVersion;
            planeVersionRef.current = ver;
            const rm2 = latestRoomRef.current ?? rmNow;
            payload = sanitizePlanePayloadForApi(rm2, mergePlaneFor409Retry(payload, ex.planeState ?? null));
            applyPlaneFromPayload(payload);
            syncPlaneSnapshotFromDto(payload);
            planeLastPersistedFingerprintRef.current = planeStateFingerprint(payload);
            setRoom((prev) =>
              prev && prev.slug === slugAtSchedule
                ? {
                    ...prev,
                    planeVersion: ver,
                    planeState: ex.planeState ?? prev.planeState,
                  }
                : prev,
            );
          }
        }
      });
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [
    slug,
    room?.id,
    boardFrozen,
    boardScale,
    boardOffset,
    blockLayouts,
    cardLayouts,
    blockMeta,
    cardMeta,
    memes,
    gadgets,
    cardStyles,
    blockStyles,
    planeShapes,
    cardTags,
    stickerConnections,
    blockLayoutsHydrated,
    cardLayoutsHydrated,
    memesHydrated,
    boardViewHydrated,
    applyPlaneFromPayload,
    planeSaveBump,
  ]);

  useEffect(() => {
    if (!slug) return;
    setSocketConnectError(null);
    setSocketSlowHint(false);
    setSocketSessionLive(false);
    const s = createAppSocket({
      auth: {
        roomUnlockToken: getRoomUnlockToken(slug) ?? undefined,
      },
    });
    setSocket(s);

    let slowTimer: number | undefined;
    const armSlow = () => {
      if (slowTimer !== undefined) window.clearTimeout(slowTimer);
      slowTimer = window.setTimeout(() => {
        if (!s.connected) setSocketSlowHint(true);
      }, 4500);
    };
    armSlow();

    const onConnect = () => {
      setSocketSessionLive(true);
      if (slowTimer !== undefined) {
        window.clearTimeout(slowTimer);
        slowTimer = undefined;
      }
      setSocketSlowHint(false);
      setSocketConnectError(null);
      s.emit("join", slug, (err: Error | null) => {
        if (err?.message === "room_password_required") {
          setRoomPasswordRequired(true);
          setRoom(null);
        }
        if (err) console.error(err);
      });
    };
    s.on("connect", onConnect);
    s.on("connect_error", (err: Error) => {
      setSocketSessionLive(false);
      setSocketConnectError(err.message || "Ошибка подключения");
    });
    s.on("disconnect", () => {
      setSocketSessionLive(false);
      setSocketSlowHint(false);
      armSlow();
    });

    s.connect();
    if (s.connected) onConnect();

    s.on(
      "room:patch",
      (msg: {
        type?: string;
        room?: RoomDto;
        block?: RoomDto["blocks"][number];
        card?: RoomDto["cards"][number];
        cardId?: string;
        blockId?: string;
        sprintStarEntry?: RoomDto["sprintStarEntries"][number];
        retroRating?: RoomDto["retroRatings"][number];
        retroOneThing?: RoomDto["retroOneThings"][number];
        warmupVote?: RoomDto["warmupVotes"][number];
        planeVersion?: number;
        planeState?: unknown;
        actionItem?: RoomDto["actionItems"][number];
        actionItemId?: string;
        reaction?: RoomDto["cardReactions"][number];
        reactionId?: string;
        patch?: unknown;
      }) => {
        if (msg.type === "plane.preview" && msg.patch && typeof msg.patch === "object" && !Array.isArray(msg.patch)) {
          applyPlaneFromPayload(msg.patch as PlaneStateDto);
          return;
        }
        if (msg.type === "plane.state" && typeof msg.planeVersion === "number" && slug) {
          if (msg.planeState && typeof msg.planeState === "object") {
            applyPlaneFromPayload(msg.planeState as PlaneStateDto);
            planeLastPersistedFingerprintRef.current = planeStateFingerprint(msg.planeState as PlaneStateDto);
          }
          planeVersionRef.current = msg.planeVersion;
          planeHydratedRef.current = `${slug}:${msg.planeVersion}`;
          setRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              planeVersion: msg.planeVersion!,
              planeState: msg.planeState ?? prev.planeState,
            };
          });
          return;
        }

        setRoom((prev) => {
          if (!prev) return prev;
          if (msg.type === "room.reset" && msg.room) {
            const next = msg.room as RoomDto;
            const hasOwner = Boolean(next.hasOwner);
            return {
              ...next,
              hasOwner,
              acl: next.acl ?? prev.acl ?? { facilitate: !hasOwner },
            };
          }
          if (msg.type === "room.ended" && msg.room) {
            const next = msg.room as RoomDto;
            const hasOwner = Boolean(next.hasOwner);
            return {
              ...next,
              hasOwner,
              acl: next.acl ?? prev.acl ?? { facilitate: !hasOwner },
            };
          }
          if (msg.type === "actionItem.created" && msg.actionItem) {
            const items = prev.actionItems ?? [];
            if (items.some((a) => a.id === msg.actionItem!.id)) return prev;
            return { ...prev, actionItems: [...items, msg.actionItem] };
          }
          if (msg.type === "actionItem.updated" && msg.actionItem) {
            const items = prev.actionItems ?? [];
            return {
              ...prev,
              actionItems: items.map((a) => (a.id === msg.actionItem!.id ? msg.actionItem! : a)),
            };
          }
          if (msg.type === "actionItem.deleted" && msg.actionItemId) {
            const items = prev.actionItems ?? [];
            return { ...prev, actionItems: items.filter((a) => a.id !== msg.actionItemId) };
          }
          if (msg.type === "card.created" && msg.card) {
            if (prev.cards.some((c) => c.id === msg.card!.id)) return prev;
            return { ...prev, cards: [...prev.cards, msg.card] };
          }
          if (msg.type === "block.created" && msg.block) {
            if (prev.blocks.some((b) => b.id === msg.block!.id)) return prev;
            return { ...prev, blocks: [...prev.blocks, msg.block] };
          }
          if (msg.type === "card.updated" && msg.card) {
            return { ...prev, cards: prev.cards.map((c) => (c.id === msg.card!.id ? msg.card! : c)) };
          }
          if (msg.type === "card.deleted" && msg.cardId) {
            const cr = prev.cardReactions ?? [];
            return {
              ...prev,
              cards: prev.cards.filter((c) => c.id !== msg.cardId),
              cardReactions: cr.filter((r) => r.cardId !== msg.cardId),
            };
          }
          if (msg.type === "block.deleted" && msg.blockId) {
            return {
              ...prev,
              blocks: prev.blocks.filter((b) => b.id !== msg.blockId),
              cards: prev.cards.filter((c) => c.blockId !== msg.blockId),
            };
          }
          if (msg.type === "sprintStar.entry.created" && msg.sprintStarEntry) {
            if (prev.sprintStarEntries.some((e) => e.id === msg.sprintStarEntry!.id)) return prev;
            return { ...prev, sprintStarEntries: [...prev.sprintStarEntries, msg.sprintStarEntry] };
          }
          if (msg.type === "sprintStar.entry.updated" && msg.sprintStarEntry) {
            return {
              ...prev,
              sprintStarEntries: prev.sprintStarEntries.map((e) =>
                e.id === msg.sprintStarEntry!.id ? msg.sprintStarEntry! : e,
              ),
            };
          }
          if (msg.type === "retro.rating.updated" && msg.retroRating) {
            const exists = prev.retroRatings.some((r) => r.id === msg.retroRating!.id);
            if (exists) {
              return {
                ...prev,
                retroRatings: prev.retroRatings.map((r) => (r.id === msg.retroRating!.id ? msg.retroRating! : r)),
              };
            }
            const replaced = prev.retroRatings.map((r) =>
              r.voterKey === msg.retroRating!.voterKey ? msg.retroRating! : r,
            );
            if (!replaced.some((r) => r.id === msg.retroRating!.id)) replaced.push(msg.retroRating);
            return { ...prev, retroRatings: replaced };
          }
          if (msg.type === "retro.oneThing.updated" && msg.retroOneThing) {
            const exists = prev.retroOneThings.some((o) => o.id === msg.retroOneThing!.id);
            if (exists) {
              return {
                ...prev,
                retroOneThings: prev.retroOneThings.map((o) => (o.id === msg.retroOneThing!.id ? msg.retroOneThing! : o)),
              };
            }
            const replaced = prev.retroOneThings.map((o) =>
              o.voterKey === msg.retroOneThing!.voterKey ? msg.retroOneThing! : o,
            );
            if (!replaced.some((o) => o.id === msg.retroOneThing!.id)) replaced.push(msg.retroOneThing);
            return { ...prev, retroOneThings: replaced };
          }
          if (msg.type === "warmup.vote.updated" && msg.warmupVote) {
            const exists = prev.warmupVotes.some((w) => w.id === msg.warmupVote!.id);
            if (exists) {
              return {
                ...prev,
                warmupVotes: prev.warmupVotes.map((w) => (w.id === msg.warmupVote!.id ? msg.warmupVote! : w)),
              };
            }
            const replaced = prev.warmupVotes.map((w) =>
              w.voterKey === msg.warmupVote!.voterKey ? msg.warmupVote! : w,
            );
            if (!replaced.some((w) => w.id === msg.warmupVote!.id)) replaced.push(msg.warmupVote);
            return { ...prev, warmupVotes: replaced };
          }
          if (msg.type === "card.reaction.added" && msg.reaction) {
            const cr = prev.cardReactions ?? [];
            if (cr.some((x) => x.id === msg.reaction!.id)) return prev;
            return { ...prev, cardReactions: [...cr, msg.reaction] };
          }
          if (msg.type === "card.reaction.removed" && msg.reactionId) {
            const cr = prev.cardReactions ?? [];
            return { ...prev, cardReactions: cr.filter((x) => x.id !== msg.reactionId) };
          }
          return prev;
        });
      },
    );
    return () => {
      if (slowTimer !== undefined) window.clearTimeout(slowTimer);
      s.removeAllListeners();
      s.close();
      setSocket(null);
      setSocketSessionLive(false);
      setSocketConnectError(null);
      setSocketSlowHint(false);
    };
  }, [slug, unlockRevision, applyPlaneFromPayload]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (boardFrozen) return;
      const items = event.clipboardData?.items;
      if (!items || items.length === 0) return;
      for (const item of items) {
        if (!item.type.startsWith("image/")) continue;
        const file = item.getAsFile();
        if (!file) continue;
        event.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const src = typeof reader.result === "string" ? reader.result : "";
          if (!src) return;
          const id = `meme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const snap = planeSnapshotRef.current;
          const pt =
            lastBoardPointerWorldRef.current ??
            boardViewportCenterWorld(boardViewportRef.current, snap.boardOffset, snap.boardScale);
          const { width, height } = worldSizeFromCssPixels(260, 180, snap.boardScale);
          setMemes((prev) => [
            ...prev,
            { id, src, x: Math.max(0, pt.x - width / 2), y: Math.max(0, pt.y - height / 2), width, height },
          ]);
          setSelectedMemeId(id);
        };
        reader.readAsDataURL(file);
        break;
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [boardFrozen]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const drag = memeDragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const prevList = memesRef.current;
      const cur = prevList.find((m) => m.id === drag.memeId);
      if (!cur) return;
      const next =
        drag.mode === "move"
          ? { ...cur, x: Math.max(0, drag.startLeft + dx), y: Math.max(0, drag.startTop + dy) }
          : { ...cur, width: Math.max(80, drag.startWidth + dx), height: Math.max(80, drag.startHeight + dy) };
      setMemes((prev) => prev.map((m) => (m.id !== drag.memeId ? m : next)));
      tryEmitPlaneLivePreview(
        socketRef.current,
        slugRef.current,
        boardFrozenRef.current,
        planeLiveThrottleUntilRef,
        { memes: [next] },
      );
    };
    const onMouseUp = () => {
      if (memeDragRef.current) {
        planeDragEndedFlushRef.current = true;
        setPlaneSaveBump((n) => n + 1);
      }
      memeDragRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const drag = gadgetDragRef.current;
      if (!drag) return;
      const dx = (event.clientX - drag.startX) / boardScale;
      const dy = (event.clientY - drag.startY) / boardScale;
      const prevList = gadgetsRef.current;
      const cur = prevList.find((g) => g.id === drag.gadgetId);
      if (!cur) return;
      const next = { ...cur, x: Math.max(8, drag.startLeft + dx), y: Math.max(8, drag.startTop + dy) };
      setGadgets((prev) => prev.map((g) => (g.id !== drag.gadgetId ? g : next)));
      tryEmitPlaneLivePreview(
        socketRef.current,
        slugRef.current,
        boardFrozenRef.current,
        planeLiveThrottleUntilRef,
        { gadgets: [next] },
      );
    };
    const onMouseUp = () => {
      if (gadgetDragRef.current) {
        planeDragEndedFlushRef.current = true;
        setPlaneSaveBump((n) => n + 1);
      }
      gadgetDragRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [boardScale]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const drag = shapeDragRef.current;
      if (!drag) return;
      const dx = (event.clientX - drag.startX) / boardScale;
      const dy = (event.clientY - drag.startY) / boardScale;
      const prevList = planeShapesRef.current;
      const cur = prevList.find((s) => s.id === drag.shapeId);
      if (!cur) return;
      const next = { ...cur, x: Math.max(0, drag.startLeft + dx), y: Math.max(0, drag.startTop + dy) };
      setPlaneShapes((prev) => prev.map((s) => (s.id !== drag.shapeId ? s : next)));
      tryEmitPlaneLivePreview(
        socketRef.current,
        slugRef.current,
        boardFrozenRef.current,
        planeLiveThrottleUntilRef,
        { planeShapes: [next] },
      );
    };
    const onMouseUp = () => {
      if (shapeDragRef.current) {
        planeDragEndedFlushRef.current = true;
        setPlaneSaveBump((n) => n + 1);
      }
      shapeDragRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [boardScale]);

  useEffect(() => {
    if (gadgets.length === 0) return;
    const t = window.setInterval(() => setBoardNowTs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [gadgets.length]);

  async function addCard(
    blockId: string,
    initialText?: string,
    opts?: {
      initialLayout?: CardLayout;
    },
  ) {
    if (!slug || !room || boardFrozen) return;
    const text = (initialText ?? "").trim();
    const name = guestName.trim() || "Гость";
    const tmpId = `tmp-${Date.now()}`;
    const now = new Date().toISOString();
    const optimistic: RoomDto["cards"][number] = {
      id: tmpId,
      blockId,
      text,
      anonymous: false,
      authorDisplayName: text ? name : null,
      row: 0,
      col: 0,
      createdAt: now,
      updatedAt: now,
    };

    if (opts?.initialLayout) {
      setCardLayouts((prev) => ({ ...prev, [tmpId]: opts.initialLayout! }));
    }
    setCardMeta((prev) => {
      const z =
        maxLayerZ({
          blockMeta: planeSnapshotRef.current.blockMeta,
          cardMeta: prev,
          gadgets: planeSnapshotRef.current.gadgets,
          shapes: planeSnapshotRef.current.planeShapes,
        }) + 1;
      return { ...prev, [tmpId]: { locked: false, z } };
    });
    setRoom((prev) => (prev ? { ...prev, cards: [...prev.cards, optimistic] } : prev));
    try {
      const result = await createCard(slug, {
        blockId,
        text,
        authorDisplayName: text ? name : null,
        anonymous: false,
        row: opts?.initialLayout ? Math.round(opts.initialLayout.y) : 0,
        col: opts?.initialLayout ? Math.round(opts.initialLayout.x) : 0,
      });
      setCardLayouts((prev) => {
        const tmpLayout = prev[tmpId];
        if (!tmpLayout) return prev;
        const next = { ...prev, [result.card.id]: tmpLayout };
        delete next[tmpId];
        return next;
      });
      setCardMeta((prev) => {
        const tmpMeta = prev[tmpId];
        if (!tmpMeta) return prev;
        const next = { ...prev, [result.card.id]: tmpMeta };
        delete next[tmpId];
        return next;
      });
      setEditDrafts((prev) => {
        if (!(tmpId in prev)) return prev;
        const next = { ...prev, [result.card.id]: prev[tmpId] };
        delete next[tmpId];
        return next;
      });
      if (selectedCardId === tmpId) setSelectedCardId(result.card.id);
      if (editingCardId === tmpId) setEditingCardId(result.card.id);
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              cards: (() => {
                const withoutTmp = prev.cards.filter((c) => c.id !== tmpId);
                if (withoutTmp.some((c) => c.id === result.card.id)) return withoutTmp;
                return [...withoutTmp, result.card];
              })(),
            }
          : prev,
      );
    } catch {
      setRoom((prev) => (prev ? { ...prev, cards: prev.cards.filter((c) => c.id !== tmpId) } : prev));
      setCardLayouts((prev) => {
        if (!(tmpId in prev)) return prev;
        const next = { ...prev };
        delete next[tmpId];
        return next;
      });
      setCardMeta((prev) => {
        if (!(tmpId in prev)) return prev;
        const next = { ...prev };
        delete next[tmpId];
        return next;
      });
    }
  }

  async function saveCardText(card: RoomDto["cards"][number]) {
    if (!slug || boardFrozen) return;
    if (editingCardId === card.id) applyStickerTagsForCard(card.id);
    const rawDraft = editDrafts[card.id] ?? card.text;
    const nextText = expandEmojiShortcodesInHtml(rawDraft).trim();
    const nextTextDoc = editorRefs.current[card.id]?.getJson() ?? null;
    const hasContent = htmlToPlainText(nextText).length > 0;
    const prevText = card.text;
    const prevTextDoc = card.textDoc ?? null;
    const nextAuthor = hasContent ? card.authorDisplayName ?? (guestName.trim() || "Гость") : card.authorDisplayName;
    setRoom((prev) =>
      prev
        ? {
            ...prev,
            cards: prev.cards.map((c) =>
              c.id === card.id
                ? {
                    ...c,
                    text: nextText,
                    textDoc: nextTextDoc,
                    authorDisplayName: hasContent ? c.authorDisplayName ?? nextAuthor : c.authorDisplayName,
                  }
                : c,
            ),
          }
        : prev,
    );
    setEditingCardId(null);
    setCardMeta((prev) => {
      const nextZ =
        maxLayerZ({
          blockMeta: planeSnapshotRef.current.blockMeta,
          cardMeta: prev,
          gadgets: planeSnapshotRef.current.gadgets,
          shapes: planeSnapshotRef.current.planeShapes,
        }) + 1;
      return { ...prev, [card.id]: { ...(prev[card.id] ?? { locked: false, z: 100 }), z: nextZ } };
    });
    try {
      const { card: saved } = await updateCard(slug, card.id, {
        text: nextText,
        textDoc: nextTextDoc,
        authorDisplayName: hasContent ? card.authorDisplayName ?? nextAuthor : card.authorDisplayName,
        expectedUpdatedAt: card.updatedAt,
      });
      setRoom((prev) =>
        prev ? { ...prev, cards: prev.cards.map((c) => (c.id === saved.id ? saved : c)) } : prev,
      );
      setStickerSaveNotice("Сохранено на сервере");
      if (stickerSaveNoticeTimerRef.current) clearTimeout(stickerSaveNoticeTimerRef.current);
      stickerSaveNoticeTimerRef.current = setTimeout(() => setStickerSaveNotice(null), 2800);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "conflict" && "card" in e) {
        const serverCard = (e as Error & { card: RoomDto["cards"][number] }).card;
        setRoom((prev) =>
          prev ? { ...prev, cards: prev.cards.map((c) => (c.id === serverCard.id ? serverCard : c)) } : prev,
        );
        setEditDrafts((prev) => ({ ...prev, [serverCard.id]: serverCard.text }));
        setStickerSaveNotice("На сервере другая версия стикера — подтянули текст");
        if (stickerSaveNoticeTimerRef.current) clearTimeout(stickerSaveNoticeTimerRef.current);
        stickerSaveNoticeTimerRef.current = setTimeout(() => setStickerSaveNotice(null), 3200);
        return;
      }
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              cards: prev.cards.map((c) =>
                c.id === card.id ? { ...c, text: prevText, textDoc: prevTextDoc } : c,
              ),
            }
          : prev,
      );
    }
  }

  async function toggleStickerReaction(cardId: string, emoji: string) {
    if (!slug || !participantKey || boardFrozen) return;
    try {
      const res = await toggleCardReaction(slug, cardId, { voterKey: participantKey, emoji });
      setRoom((prev) => {
        if (!prev) return prev;
        const cr = prev.cardReactions ?? [];
        if (res.removed) {
          return { ...prev, cardReactions: cr.filter((x) => x.id !== res.reactionId) };
        }
        if (cr.some((x) => x.id === res.reaction.id)) return prev;
        return { ...prev, cardReactions: [...cr, res.reaction] };
      });
    } catch {
      /* ignore */
    }
  }

  function StickerReactionsBar({ cardId }: { cardId: string }) {
    const reactions = room?.cardReactions?.filter((r) => r.cardId === cardId) ?? [];
    const counts = new Map<string, number>();
    const mine = new Set<string>();
    for (const r of reactions) {
      counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
      if (r.voterKey === participantKey) mine.add(r.emoji);
    }
    return (
      <div
        className={`mt-1 flex flex-wrap items-center gap-1 ${isLight ? "border-t border-zinc-200/80 pt-1" : "border-t border-white/10 pt-1"}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {CARD_REACTION_PRESETS.map((emoji) => {
          const count = counts.get(emoji) ?? 0;
          const active = mine.has(emoji);
          return (
            <button
              key={emoji}
              type="button"
              title={emoji}
              disabled={boardFrozen}
              className={`inline-flex min-h-[26px] items-center gap-0.5 rounded px-1 text-xs ${active ? (isLight ? "bg-zinc-200" : "bg-white/15") : isLight ? "hover:bg-zinc-100" : "hover:bg-white/10"} disabled:opacity-40`}
              onClick={() => void toggleStickerReaction(cardId, emoji)}
            >
              <span>{emoji}</span>
              {count > 0 ? <span className="tabular-nums opacity-80">{count}</span> : null}
            </button>
          );
        })}
      </div>
    );
  }

  function shouldSkipStickerSaveForFormatToolbar(e: React.FocusEvent) {
    const next = e.relatedTarget as HTMLElement | null;
    return Boolean(
      next && typeof next.closest === "function" && next.closest("[data-sticker-format-toolbar='true']"),
    );
  }

  async function voteForSprintStar(entryId: string, delta: number) {
    if (!slug || !room || !participantKey || boardFrozen) return;
    const snapshotEntries = room.sprintStarEntries;
    const snapshotVotes = room.sprintStarVotes;
    const myVote = room.sprintStarVotes.find((v) => v.voterKey === participantKey);
    const hadVote = room.sprintStarVotes.some((v) => v.entryId === entryId && v.voterKey === participantKey);
    if (delta < 0 && !hadVote) return;
    if (delta > 0 && hadVote) return;
    setRoom((prev) =>
      prev
        ? {
            ...prev,
            sprintStarEntries: prev.sprintStarEntries.map((e) =>
              e.id === entryId
                ? { ...e, starCount: Math.max(0, e.starCount + delta) }
                : delta > 0 && myVote && e.id === myVote.entryId
                  ? { ...e, starCount: Math.max(0, e.starCount - 1) }
                  : e,
            ),
            sprintStarVotes:
              delta > 0
                ? [
                    ...prev.sprintStarVotes.filter((v) => v.voterKey !== participantKey),
                    {
                      id: `tmp-vote-${Date.now()}`,
                      entryId,
                      voterKey: participantKey,
                      createdAt: new Date().toISOString(),
                    },
                  ]
                : prev.sprintStarVotes.filter((v) => !(v.entryId === entryId && v.voterKey === participantKey)),
          }
        : prev,
    );
    try {
      const result = await voteSprintStarEntry(slug, entryId, { delta, voterKey: participantKey });
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              sprintStarEntries: prev.sprintStarEntries.map((e) =>
                e.id === entryId ? result.sprintStarEntry : e,
              ),
              sprintStarVotes: result.myVoted
                ? [
                    ...prev.sprintStarVotes.filter(
                      (v) =>
                        !(
                          v.voterKey === participantKey &&
                          (v.entryId === entryId || v.id.startsWith("tmp-vote-"))
                        ),
                    ),
                    {
                      id: `local-${entryId}-${participantKey}`,
                      entryId,
                      voterKey: participantKey,
                      createdAt: new Date().toISOString(),
                    },
                  ]
                : prev.sprintStarVotes.filter(
                    (v) =>
                      !(
                        v.voterKey === participantKey &&
                        (v.entryId === entryId || v.id.startsWith("tmp-vote-"))
                      ),
                  ),
            }
          : prev,
      );
    } catch {
      setRoom((prev) =>
        prev ? { ...prev, sprintStarEntries: snapshotEntries, sprintStarVotes: snapshotVotes } : prev,
      );
    }
  }

  async function toggleSprintStar(entryId: string) {
    if (!room || !participantKey) return;
    const myVoteEntryId = room.sprintStarVotes.find((v) => v.voterKey === participantKey)?.entryId ?? null;
    if (myVoteEntryId === entryId) {
      await voteForSprintStar(entryId, -1);
      return;
    }
    await voteForSprintStar(entryId, 1);
  }

  async function setRetroScore(score: number) {
    if (!slug || !room || !participantKey || boardFrozen) return;
    const snapshot = room.retroRatings;
    const mine = room.retroRatings.find((r) => r.voterKey === participantKey);
    const optimistic: RoomDto["retroRatings"][number] = mine
      ? { ...mine, score, updatedAt: new Date().toISOString() }
      : {
          id: `tmp-rating-${Date.now()}`,
          voterKey: participantKey,
          score,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

    setRoom((prev) =>
      prev
        ? {
            ...prev,
            retroRatings: [
              ...prev.retroRatings.filter((r) => r.voterKey !== participantKey),
              optimistic,
            ],
          }
        : prev,
    );
    try {
      const result = await upsertRetroRating(slug, { voterKey: participantKey, score });
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              retroRatings: [
                ...prev.retroRatings.filter((r) => r.voterKey !== participantKey),
                result.retroRating,
              ],
            }
          : prev,
      );
    } catch {
      setRoom((prev) => (prev ? { ...prev, retroRatings: snapshot } : prev));
    }
  }

  async function setWarmupOption(optionId: string) {
    if (!slug || !room || !participantKey || boardFrozen) return;
    const voterName = (guestName.trim() || "Гость").slice(0, 80);
    const snapshot = room.warmupVotes;
    const existing = room.warmupVotes.find((w) => w.voterKey === participantKey);
    const optimistic: RoomDto["warmupVotes"][number] = existing
      ? { ...existing, optionId, voterName, updatedAt: new Date().toISOString() }
      : {
          id: `tmp-warmup-${Date.now()}`,
          optionId,
          voterKey: participantKey,
          voterName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
    setRoom((prev) =>
      prev
        ? {
            ...prev,
            warmupVotes: [...prev.warmupVotes.filter((w) => w.voterKey !== participantKey), optimistic],
          }
        : prev,
    );
    try {
      const result = await upsertWarmupVote(slug, { optionId, voterKey: participantKey, voterName });
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              warmupVotes: [...prev.warmupVotes.filter((w) => w.voterKey !== participantKey), result.warmupVote],
            }
          : prev,
      );
    } catch {
      setRoom((prev) => (prev ? { ...prev, warmupVotes: snapshot } : prev));
    }
  }

  function beginMemeDrag(event: React.MouseEvent, meme: MemeItem, mode: "move" | "resize") {
    if (boardFrozen) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedMemeId(meme.id);
    memeDragRef.current = {
      memeId: meme.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: meme.x,
      startTop: meme.y,
      startWidth: meme.width,
      startHeight: meme.height,
    };
  }

  function removeMeme(memeId: string) {
    setMemes((prev) => prev.filter((m) => m.id !== memeId));
    setSelectedMemeId((prev) => (prev === memeId ? null : prev));
  }

  function beginGadgetDrag(event: React.MouseEvent, g: BoardGadgetDto) {
    if (boardFrozen) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedGadgetId(g.id);
    setSelectedShapeId(null);
    gadgetDragRef.current = {
      gadgetId: g.id,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: g.x,
      startTop: g.y,
    };
  }

  function beginShapeDrag(event: React.MouseEvent, shape: PlaneShapeDto) {
    if (boardFrozen) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedShapeId(shape.id);
    setSelectedGadgetId(null);
    setSelectedMemeId(null);
    shapeDragRef.current = {
      shapeId: shape.id,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: shape.x,
      startTop: shape.y,
    };
  }

  function removeGadget(id: string) {
    setGadgets((prev) => prev.filter((x) => x.id !== id));
    setSelectedGadgetId((prev) => (prev === id ? null : prev));
  }

  function addBoardTimerGadget() {
    if (boardFrozen) return;
    const raw = window.prompt("Таймер на плоскости: через сколько минут показать 0:00?", "15");
    if (raw == null) return;
    const m = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(m) || m <= 0 || m > 2880) {
      window.alert("Введите число минут от 1 до 2880 (до 48 часов).");
      return;
    }
    const id = `timer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const snap = planeSnapshotRef.current;
    const pt =
      lastBoardPointerWorldRef.current ??
      boardViewportCenterWorld(boardViewportRef.current, snap.boardOffset, snap.boardScale);
    setGadgets((prev) => {
      const layerZ =
        maxLayerZ({
          blockMeta: planeSnapshotRef.current.blockMeta,
          cardMeta: planeSnapshotRef.current.cardMeta,
          gadgets: prev,
          shapes: planeSnapshotRef.current.planeShapes,
        }) + 1;
      return [
        ...prev,
        {
          id,
          kind: "timer",
          x: Math.max(8, pt.x),
          y: Math.max(8, pt.y),
          endsAtMs: Date.now() + Math.round(m * 60_000),
          layerZ,
        },
      ];
    });
    setSelectedGadgetId(id);
    setSelectedMemeId(null);
  }

  function cloneSnapshot(snapshot: BoardViewSnapshot): BoardViewSnapshot {
    return {
      boardScale: snapshot.boardScale,
      boardOffset: { ...snapshot.boardOffset },
      blockLayouts: Object.fromEntries(
        Object.entries(snapshot.blockLayouts).map(([id, v]) => [id, { ...v }]),
      ),
      cardLayouts: Object.fromEntries(
        Object.entries(snapshot.cardLayouts).map(([id, v]) => [id, { ...v }]),
      ),
      memes: snapshot.memes.map((m) => ({ ...m })),
      gadgets: snapshot.gadgets.map((g) => ({ ...g })),
      cardStyles: Object.fromEntries(
        Object.entries(snapshot.cardStyles ?? {}).map(([id, v]) => [id, { ...v }]),
      ),
      blockStyles: Object.fromEntries(
        Object.entries(snapshot.blockStyles ?? {}).map(([id, v]) => [id, { ...v }]),
      ),
      planeShapes: snapshot.planeShapes.map((s) => ({ ...s })),
    };
  }

  function buildViewSnapshot(): BoardViewSnapshot {
    return {
      boardScale,
      boardOffset: { ...boardOffset },
      blockLayouts: Object.fromEntries(
        Object.entries(blockLayouts).map(([id, v]) => [id, { ...v }]),
      ),
      cardLayouts: Object.fromEntries(
        Object.entries(cardLayouts).map(([id, v]) => [id, { ...v }]),
      ),
      memes: memes.map((m) => ({ ...m })),
      gadgets: gadgets.map((g) => ({ ...g })),
      cardStyles: Object.fromEntries(
        Object.entries(cardStyles).map(([id, v]) => [id, { ...v }]),
      ),
      blockStyles: Object.fromEntries(
        Object.entries(blockStyles).map(([id, v]) => [id, { ...v }]),
      ),
      planeShapes: planeShapes.map((s) => ({ ...s })),
    };
  }

  function applyViewSnapshot(snapshot: BoardViewSnapshot) {
    applyingHistoryRef.current = true;
    setBoardScale(snapshot.boardScale);
    setBoardOffset({ ...snapshot.boardOffset });
    setBlockLayouts(
      Object.fromEntries(Object.entries(snapshot.blockLayouts).map(([id, v]) => [id, { ...v }])),
    );
    setCardLayouts(
      Object.fromEntries(Object.entries(snapshot.cardLayouts).map(([id, v]) => [id, { ...v }])),
    );
    setMemes(snapshot.memes.map((m) => ({ ...m })));
    setGadgets(snapshot.gadgets.map((g) => ({ ...g })));
    setCardStyles(Object.fromEntries(Object.entries(snapshot.cardStyles ?? {}).map(([id, v]) => [id, { ...v }])));
    setBlockStyles(Object.fromEntries(Object.entries(snapshot.blockStyles ?? {}).map(([id, v]) => [id, { ...v }])));
    setPlaneShapes(snapshot.planeShapes.map((s) => ({ ...s })));
    window.setTimeout(() => {
      applyingHistoryRef.current = false;
    }, 0);
  }

  function undoViewAction() {
    setViewHistoryPast((past) => {
      if (past.length < 2) return past;
      const current = cloneSnapshot(past[past.length - 1]);
      const previous = cloneSnapshot(past[past.length - 2]);
      setViewHistoryFuture((future) => [current, ...future]);
      applyViewSnapshot(previous);
      return past.slice(0, -1);
    });
  }

  function redoViewAction() {
    setViewHistoryFuture((future) => {
      if (future.length === 0) return future;
      const [next, ...rest] = future;
      const nextSnapshot = cloneSnapshot(next);
      setViewHistoryPast((past) => [...past, cloneSnapshot(nextSnapshot)].slice(-120));
      applyViewSnapshot(nextSnapshot);
      return rest;
    });
  }

  async function resetBoardPlane() {
    if (!slug || boardFrozen) return;
    if (!canFacilitate) {
      window.alert(
        "Сброс комнаты доступен только владельцу или фасилитатору. Войдите в аккаунт, с которым создана комната.",
      );
      return;
    }
    if (typeof window !== "undefined") {
      const ok = window.confirm("Сбросить комнату к состоянию при создании? Все текущие изменения будут удалены.");
      if (!ok) return;
    }
    try {
      const nextRoom = await resetRoom(slug, { confirm: true });
      setRoom(nextRoom);
      planeVersionRef.current = nextRoom.planeVersion ?? 0;
      planeHydratedRef.current = null;
      planeLastPersistedFingerprintRef.current = null;
    } catch (e) {
      if (e instanceof Error && e.message === "forbidden") {
        window.alert("Недостаточно прав для сброса комнаты.");
      }
      return;
    }

    setBoardScale(DEFAULT_BOARD_SCALE);
    setBoardOffset(DEFAULT_BOARD_OFFSET);
    setBlockLayouts({});
    setCardLayouts({});
    setBlockMeta({});
    setCardMeta({});
    setMemes([]);
    setGadgets([]);
    setPlaneShapes([]);
    setCardStyles({});
    setBlockStyles({});
    setSelectedCardId(null);
    setSelectedMemeId(null);
    setSelectedGadgetId(null);
    setSelectedShapeId(null);
    setPendingStickerPlacement(false);
    setPendingStickerPos(null);
    setViewHistoryPast([]);
    setViewHistoryFuture([]);
    try {
      localStorage.removeItem(`${BOARD_LAYOUT_KEY_PREFIX}:${slug}`);
      localStorage.removeItem(`${CARD_LAYOUT_KEY_PREFIX}:${slug}`);
      localStorage.removeItem(`${BOARD_VIEW_KEY_PREFIX}:${slug}`);
      localStorage.removeItem(`${MEMES_KEY_PREFIX}:${slug}`);
    } catch {
      /* ignore */
    }
  }

  async function onEndRetro() {
    if (!slug || !room || room.status === "ended") return;
    if (!canFacilitate) {
      window.alert(
        "Завершить ретро может только владелец или фасилитатор. Войдите в аккаунт, с которым создана комната.",
      );
      return;
    }
    if (typeof window !== "undefined") {
      const ok = window.confirm("Завершить ретро? Редактирование доски и голосования будут отключены. Продолжить?");
      if (!ok) return;
    }
    try {
      const next = await endRetro(slug, { confirm: true });
      setRoom(next);
      planeVersionRef.current = next.planeVersion ?? 0;
      planeHydratedRef.current = null;
      planeLastPersistedFingerprintRef.current = null;
      navigate(`/r/${slug}/summary`);
    } catch (e) {
      if (e instanceof Error && e.message === "forbidden") {
        window.alert("Недостаточно прав для завершения ретро.");
      }
    }
  }

  function placeStickerAtBoardPoint(blockId: string, boardX: number, boardY: number) {
    if (boardFrozen) return;
    const { width, height } = worldSizeFromCssPixels(DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT, boardScale);
    void addCard(blockId, "", {
      initialLayout: {
        x: boardX - width / 2,
        y: boardY - height / 2,
        width,
        height,
      },
    });
  }

  /** Координаты layout стикера внутри `data-sticker-drop-zone` (до scale), из клика в viewport. */
  function stickerLocalPosInDropZone(
    zone: HTMLElement,
    clientX: number,
    clientY: number,
    stickerW: number,
    stickerH: number,
  ) {
    const r = zone.getBoundingClientRect();
    const cw = zone.clientWidth || r.width;
    const ch = zone.clientHeight || r.height;
    const scaleX = cw > 0 ? r.width / cw : 1;
    const scaleY = ch > 0 ? r.height / ch : 1;
    let lx = (clientX - r.left) / scaleX - stickerW / 2;
    let ly = (clientY - r.top) / scaleY - stickerH / 2;
    const maxX = Math.max(0, cw - stickerW);
    const maxY = Math.max(0, ch - stickerH);
    lx = Math.min(Math.max(0, lx), maxX);
    ly = Math.min(Math.max(0, ly), maxY);
    return { lx, ly };
  }

  function addBlockFromToolbar(ev?: React.MouseEvent) {
    if (boardFrozen) return;
    const pt = ev
      ? boardPointFromClient(boardViewportRef.current, ev.clientX, ev.clientY, boardOffset, boardScale)
      : lastBoardPointerWorldRef.current ??
        boardViewportCenterWorld(boardViewportRef.current, boardOffset, boardScale);
    setPendingBlockKind("improve");
    setPendingBlockPos({ x: pt.x, y: pt.y });
  }

  async function placeBlockAtBoardPoint(kind: string, boardX: number, boardY: number) {
    if (!slug || boardFrozen) return;
    try {
      const result = await createBlock(slug, { kind, gridColumns: 5 });
      const base = getBaseBlockSize(kind);
      const sc = Math.max(1e-6, boardScale);
      const bw = base.width / sc;
      const bh = base.height / sc;
      setRoom((prev) => {
        if (!prev) return prev;
        if (prev.blocks.some((b) => b.id === result.block.id)) return prev;
        return { ...prev, blocks: [...prev.blocks, result.block] };
      });
      setBlockLayouts((prev) => ({
        ...prev,
        [result.block.id]: {
          x: boardX - bw / 2,
          y: boardY - bh / 2,
          width: bw,
          height: bh,
        },
      }));
      setBlockMeta((prev) => {
        const nextZ =
          maxLayerZ({
            blockMeta: prev,
            cardMeta: planeSnapshotRef.current.cardMeta,
            gadgets: planeSnapshotRef.current.gadgets,
            shapes: planeSnapshotRef.current.planeShapes,
          }) + 1;
        return { ...prev, [result.block.id]: { locked: false, z: nextZ } };
      });
    } catch {
      /* ignore */
    }
  }

  async function ensureFreeCanvasBlockId(): Promise<string | null> {
    if (!slug || !room || boardFrozen) return null;
    const existing = room.blocks.find((b) => b.kind === FREE_CANVAS_BLOCK_KIND);
    if (existing) return existing.id;
    try {
      const created = await createBlock(slug, { kind: FREE_CANVAS_BLOCK_KIND, gridColumns: 1 });
      setRoom((prev) => {
        if (!prev) return prev;
        if (prev.blocks.some((b) => b.id === created.block.id)) return prev;
        return { ...prev, blocks: [...prev.blocks, created.block] };
      });
      return created.block.id;
    } catch {
      return null;
    }
  }

  function addPresetSchemeFrames(presetId: string) {
    if (boardFrozen) return;
    const preset = BOARD_SCHEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const viewport = boardViewportRef.current;
    const viewportW = viewport?.clientWidth ?? window.innerWidth;
    const viewportH = viewport?.clientHeight ?? window.innerHeight;
    const cx = (viewportW / 2 - boardOffset.x) / boardScale;
    const cy = (viewportH / 2 - boardOffset.y) / boardScale;
    const snap = planeSnapshotRef.current;
    const origin = lastBoardPointerWorldRef.current ?? { x: cx, y: cy };
    const baseLayer = Math.max(
      8,
      minLayerZ({
        blockMeta: snap.blockMeta,
        cardMeta: snap.cardMeta,
        gadgets: snap.gadgets,
        shapes: snap.planeShapes,
      }) - 5,
    );
    const t = Date.now();
    const inv = 1 / Math.max(1e-6, boardScale);
    const nextFrames: PlaneShapeDto[] = preset.frames.map((f, i) => ({
      id: `frame-${t}-${i}`,
      kind: "frame",
      x: Math.max(0, origin.x + f.ox * inv),
      y: Math.max(0, origin.y + f.oy * inv),
      width: f.width * inv,
      height: f.height * inv,
      stroke: f.stroke ?? "#64748b",
      fill: f.fill ?? "transparent",
      label: f.label,
      layerZ: baseLayer + i,
    }));
    setPlaneShapes((prev) => [...prev, ...nextFrames]);
    setPlaneToolsOpen(false);
  }

  async function addStickerFromTemplateHtml(html: string, ev?: React.MouseEvent) {
    if (!slug || !room || boardFrozen) return;
    const blockId = await ensureFreeCanvasBlockId();
    if (!blockId) return;
    const scale = boardScale;
    const off = boardOffset;
    const pt = ev
      ? boardPointFromClient(boardViewportRef.current, ev.clientX, ev.clientY, off, scale)
      : lastBoardPointerWorldRef.current ?? boardViewportCenterWorld(boardViewportRef.current, off, scale);
    const { width, height } = worldSizeFromCssPixels(DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT, scale);
    await addCard(blockId, html, {
      initialLayout: {
        x: pt.x - width / 2,
        y: pt.y - height / 2,
        width,
        height,
      },
    });
    setPlaneToolsOpen(false);
  }

  async function addStickerFromToolbar(ev?: React.MouseEvent) {
    if (!slug || !room || boardFrozen) return;
    const cid = await ensureFreeCanvasBlockId();
    if (!cid) return;
    const pt = ev
      ? boardPointFromClient(boardViewportRef.current, ev.clientX, ev.clientY, boardOffset, boardScale)
      : lastBoardPointerWorldRef.current ??
        boardViewportCenterWorld(boardViewportRef.current, boardOffset, boardScale);
    setPendingStickerPos({ x: pt.x, y: pt.y });
    setPendingStickerPlacement(true);
  }

  function onSelectImageFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      if (!src) return;
      const id = `meme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const snap = planeSnapshotRef.current;
      const pt =
        lastBoardPointerWorldRef.current ??
        boardViewportCenterWorld(boardViewportRef.current, snap.boardOffset, snap.boardScale);
      const { width, height } = worldSizeFromCssPixels(260, 180, snap.boardScale);
      setMemes((prev) => [...prev, { id, src, x: Math.max(0, pt.x - width / 2), y: Math.max(0, pt.y - height / 2), width, height }]);
      setSelectedMemeId(id);
      if (imageInputRef.current) imageInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  }

  function formatSticker(cardId: string, command: string, value?: string) {
    const api = editorRefs.current[cardId];
    if (!api) return;
    api.runCommand(command, value);
    syncEditDraftFromEditor(cardId);
  }

  function insertStickerEmojiChars(cardId: string, chars: string) {
    rememberStickerEmoji(chars);
    setStickerRecentEmojis(loadRecentStickerEmojis());
    const api = editorRefs.current[cardId];
    if (!api) return;
    api.insertText(chars);
    syncEditDraftFromEditor(cardId);
  }

  function selectionInsideEditor(editor: HTMLElement) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return null;
    return range;
  }

  function wrapStickerSelectionStyle(cardId: string, styles: Record<string, string>) {
    const editor = stickerEditorDom(cardId);
    if (!editor) return;
    editor.focus();
    const range = selectionInsideEditor(editor);
    if (!range || range.collapsed) return;
    const api = editorRefs.current[cardId];
    const span = document.createElement("span");
    for (const [k, v] of Object.entries(styles)) {
      span.style.setProperty(k, v);
    }
    try {
      range.surroundContents(span);
    } catch {
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    const sel = window.getSelection();
    sel?.removeAllRanges();
    const nr = document.createRange();
    nr.selectNodeContents(span);
    nr.collapse(false);
    sel?.addRange(nr);
    api?.syncFromDom();
    syncEditDraftFromEditor(cardId);
  }

  function insertStickerHtml(cardId: string, html: string) {
    const api = editorRefs.current[cardId];
    if (!api) return;
    api.insertHtml(html);
    syncEditDraftFromEditor(cardId);
  }

  function insertStickerTable(cardId: string) {
    const api = editorRefs.current[cardId];
    if (!api) return;
    api.runTableCommand("insertTable");
    syncEditDraftFromEditor(cardId);
  }

  function stickerHighlightColor(cardId: string, color: string) {
    const api = editorRefs.current[cardId];
    if (!api) return;
    api.setHighlight(color);
    syncEditDraftFromEditor(cardId);
  }

  function readStickerLinkHrefFromSelection(cardId: string): string {
    const api = editorRefs.current[cardId];
    if (!api) return "https://";
    return api.readLinkHref();
  }

  function openStickerLinkPanel(cardId: string) {
    setStickerLinkHref(readStickerLinkHrefFromSelection(cardId));
    setStickerLinkOpen(true);
    window.setTimeout(() => stickerLinkInputRef.current?.focus(), 0);
  }

  function applyStickerLink(cardId: string) {
    const href = normalizeStickerHttpUrl(stickerLinkHref);
    if (!href) {
      if (stickerLinkHref.trim() !== "") window.alert("Введите корректный http(s) URL.");
      return;
    }
    const api = editorRefs.current[cardId];
    if (!api) return;
    api.applyLink(href);
    syncEditDraftFromEditor(cardId);
    setStickerLinkOpen(false);
  }

  function unlinkStickerSelection(cardId: string) {
    formatSticker(cardId, "unlink");
  }

  function clearStickerFormatting(cardId: string) {
    const api = editorRefs.current[cardId];
    if (!api) return;
    api.runCommand("removeFormat");
    syncEditDraftFromEditor(cardId);
  }

  function copyStickerFormat(cardId: string) {
    const editor = stickerEditorDom(cardId);
    if (!editor) return;
    editor.focus();
    const range = selectionInsideEditor(editor);
    if (!range || range.collapsed) return;
    let node: HTMLElement | null =
      range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : (range.startContainer as HTMLElement);
    if (!node) return;
    if (!editor.contains(node)) return;
    const cs = window.getComputedStyle(node);
    stickerFormatPaintRef.current = {
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      textDecoration: cs.textDecoration,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
    };
  }

  function pasteStickerFormat(cardId: string) {
    const styles = stickerFormatPaintRef.current;
    if (!styles) return;
    wrapStickerSelectionStyle(cardId, {
      fontWeight: styles.fontWeight,
      fontStyle: styles.fontStyle,
      textDecoration: styles.textDecoration,
      color: styles.color,
      backgroundColor: styles.backgroundColor,
      fontFamily: styles.fontFamily,
      fontSize: styles.fontSize,
    });
  }

  function stickerSelectionCase(cardId: string, mode: "upper" | "lower" | "sentence") {
    const editor = stickerEditorDom(cardId);
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer) || range.collapsed) return;
    const t = range.toString();
    let out = t;
    if (mode === "upper") out = t.toLocaleUpperCase("ru-RU");
    else if (mode === "lower") out = t.toLocaleLowerCase("ru-RU");
    else if (t.length > 0)
      out = t[0].toLocaleUpperCase("ru-RU") + t.slice(1).toLocaleLowerCase("ru-RU");
    range.deleteContents();
    range.insertNode(document.createTextNode(out));
    sel.removeAllRanges();
    sel.addRange(range);
    editorRefs.current[cardId]?.syncFromDom();
    syncEditDraftFromEditor(cardId);
  }

  function stickerBlockquote(cardId: string) {
    formatSticker(cardId, "formatBlock", "blockquote");
  }

  function insertStickerCodeBlock(cardId: string) {
    formatSticker(cardId, "formatBlock", "code");
  }

  function insertStickerHorizontalRule(cardId: string) {
    formatSticker(cardId, "insertHorizontalRule");
  }

  async function pastePlainFromClipboard(cardId: string) {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const api = editorRefs.current[cardId];
      if (!api) return;
      api.insertText(text);
      syncEditDraftFromEditor(cardId);
    } catch {
      /* ignore */
    }
  }

  function stickerEditorLinkClick(e: React.MouseEvent) {
    if (!e.ctrlKey && !e.metaKey) return;
    const a = (e.target as HTMLElement | null)?.closest?.("a[href]");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || href.trim() === "" || /^javascript:/i.test(href)) return;
    e.preventDefault();
    try {
      const u = new URL(href, window.location.href);
      if (u.protocol === "http:" || u.protocol === "https:") window.open(href, "_blank", "noopener,noreferrer");
    } catch {
      /* ignore */
    }
  }

  function handleStickerPaste(cardId: string, e: ReactClipboardEvent) {
    const api = editorRefs.current[cardId];
    if (!api) return;
    const htmlData = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain") ?? "";
    const curLen = api.getHtml().length;
    if (htmlData && plain) {
      e.preventDefault();
      if (curLen + plain.length > STICKER_HTML_MAX_CHARS) return;
      api.insertText(plain);
      syncEditDraftFromEditor(cardId);
      return;
    }
    if (curLen >= STICKER_HTML_MAX_CHARS) {
      e.preventDefault();
    }
  }

  function stickerTableAddRowBelow(cardId: string) {
    const api = editorRefs.current[cardId];
    if (!api?.runTableCommand("addRowAfter")) return;
    syncEditDraftFromEditor(cardId);
  }

  function stickerTableAddColumnRight(cardId: string) {
    const api = editorRefs.current[cardId];
    if (!api?.runTableCommand("addColumnAfter")) return;
    syncEditDraftFromEditor(cardId);
  }

  function stickerTableRemoveRow(cardId: string) {
    const api = editorRefs.current[cardId];
    if (!api?.runTableCommand("deleteRow")) return;
    syncEditDraftFromEditor(cardId);
  }

  function stickerTableRemoveColumn(cardId: string) {
    const api = editorRefs.current[cardId];
    if (!api?.runTableCommand("deleteColumn")) return;
    syncEditDraftFromEditor(cardId);
  }

  function stickerTableMergeRight(cardId: string) {
    const api = editorRefs.current[cardId];
    const editor = stickerEditorDom(cardId);
    if (!api || !editor) return;
    if (!mergeStickerTableCellRight(editor)) return;
    api.syncFromDom();
    syncEditDraftFromEditor(cardId);
  }

  function stickerTableMergeDown(cardId: string) {
    const api = editorRefs.current[cardId];
    const editor = stickerEditorDom(cardId);
    if (!api || !editor) return;
    if (!mergeStickerTableCellDown(editor)) return;
    api.syncFromDom();
    syncEditDraftFromEditor(cardId);
  }

  function stickerTableSplitHorizontal(cardId: string) {
    const api = editorRefs.current[cardId];
    const editor = stickerEditorDom(cardId);
    if (!api || !editor) return;
    if (!splitStickerTableCellHorizontal(editor)) return;
    api.syncFromDom();
    syncEditDraftFromEditor(cardId);
  }

  function stickerTableSplitVertical(cardId: string) {
    const api = editorRefs.current[cardId];
    const editor = stickerEditorDom(cardId);
    if (!api || !editor) return;
    if (!splitStickerTableCellVertical(editor)) return;
    api.syncFromDom();
    syncEditDraftFromEditor(cardId);
  }

  function insertStickerColumnsBlock(cardId: string, cols: 2 | 3) {
    insertStickerHtml(
      cardId,
      `<div style="column-count:${cols};column-gap:12px;break-inside:avoid"><p>&#8203;</p><p>&#8203;</p></div>`,
    );
  }

  async function copyStickerAsMarkdown(cardId: string) {
    const html =
      editDrafts[cardId] ?? room?.cards.find((c) => c.id === cardId)?.text ?? "";
    const md = htmlToMarkdownLite(html);
    try {
      await navigator.clipboard.writeText(md);
      setStickerSaveNotice("Markdown скопирован в буфер");
      if (stickerSaveNoticeTimerRef.current) clearTimeout(stickerSaveNoticeTimerRef.current);
      stickerSaveNoticeTimerRef.current = setTimeout(() => setStickerSaveNotice(null), 2200);
    } catch {
      /* ignore */
    }
  }

  const actorMentionIds = useMemo(
    () => currentActorMentionIds(authMe, guestName),
    [authMe, guestName],
  );
  const actorDisplayName = useMemo(
    () => currentActorDisplayName(authMe, guestName),
    [authMe, guestName],
  );

  const stickerCollabUser = useMemo(
    () => ({
      name: stickerCollabUserLabel(actorDisplayName, participantKey),
      color: stickerCollabUserColor(participantKey || guestName || "local"),
    }),
    [actorDisplayName, participantKey, guestName],
  );

  const stickerCollabProvider = useStickerCollab(
    socket,
    slug,
    editingCardId,
    editingCardId && socketSessionLive ? stickerCollabUser : null,
  );

  /** При онлайн-сокете ждём Yjs-провайдер, чтобы не монтировать solo-редактор и не пересоздавать TipTap. */
  const stickerEditReady = !socketSessionLive || stickerCollabProvider !== null;
  const stickerEditCollab = Boolean(socketSessionLive && stickerCollabProvider);

  const mentionCandidatesLive = useMemo(() => {
    if (!room || !mentionSuggest) return [] as MentionCandidate[];
    return filterMentionCandidates(
      buildMentionCandidatesFromRoom(room, authMe, guestName),
      mentionSuggest.query,
    );
  }, [room, authMe, guestName, mentionSuggest]);

  useEffect(() => {
    if (!editingCardId) {
      setStickerTagsDraft("");
      setMentionSuggest(null);
      return;
    }
    setStickerTagsDraft(formatStickerTagsForInput(cardTags[editingCardId]));
  }, [editingCardId, cardTags]);

  useEffect(() => {
    if (!connectionDraftFrom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConnectionDraftFrom(null);
        setConnectionHoverCardId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [connectionDraftFrom]);

  function cardMatchesMineFilter(card: RoomDto["cards"][number]): boolean {
    if (!stickerFilterMine) return true;
    const me = actorDisplayName.trim().toLowerCase();
    const author = (card.authorDisplayName ?? "").trim().toLowerCase();
    if (author && author === me) return true;
    if (cardHtmlMentionsMe(card.text, actorMentionIds)) return true;
    const draft = editDrafts[card.id];
    if (draft && cardHtmlMentionsMe(draft, actorMentionIds)) return true;
    return false;
  }

  function pickMentionCandidate(candidate: MentionCandidate) {
    if (!mentionSuggest) return;
    const api = editorRefs.current[mentionSuggest.cardId];
    const editor = stickerEditorDom(mentionSuggest.cardId);
    if (!api || !editor) return;
    const ctx = getMentionAutocompleteAtCaret(editor);
    if (!ctx) return;
    insertStickerTipTapMention(api.getEditor(), editor, ctx, candidate);
    syncEditDraftFromEditor(mentionSuggest.cardId);
    setMentionSuggest(null);
  }

  function applyStickerTagsForCard(cardId: string) {
    const tags = parseStickerTagInput(stickerTagsDraft);
    setCardTags((prev) => {
      const next = { ...prev };
      if (tags.length) next[cardId] = tags;
      else delete next[cardId];
      return next;
    });
  }

  function startConnectionDraft(cardId: string) {
    setConnectionDraftFrom(cardId);
    setConnectionHoverCardId(null);
    setStickerSaveNotice("Кликните второй стикер (Esc — отмена)");
    if (stickerSaveNoticeTimerRef.current) clearTimeout(stickerSaveNoticeTimerRef.current);
    stickerSaveNoticeTimerRef.current = setTimeout(() => setStickerSaveNotice(null), 3200);
  }

  function completeStickerConnection(toCardId: string) {
    if (!connectionDraftFrom || connectionDraftFrom === toCardId || boardFrozen) return;
    const dup = stickerConnections.some(
      (c) =>
        (c.fromCardId === connectionDraftFrom && c.toCardId === toCardId) ||
        (c.fromCardId === toCardId && c.toCardId === connectionDraftFrom),
    );
    if (!dup) {
      setStickerConnections((prev) => [
        ...prev,
        { id: newStickerConnectionId(), fromCardId: connectionDraftFrom, toCardId },
      ]);
    }
    setConnectionDraftFrom(null);
    setConnectionHoverCardId(null);
    setStickerSaveNotice("Связь добавлена");
    if (stickerSaveNoticeTimerRef.current) clearTimeout(stickerSaveNoticeTimerRef.current);
    stickerSaveNoticeTimerRef.current = setTimeout(() => setStickerSaveNotice(null), 2200);
  }

  function removeConnectionsForCard(cardId: string) {
    setStickerConnections((prev) => prev.filter((c) => c.fromCardId !== cardId && c.toCardId !== cardId));
  }

  function handleStickerEditorKeyDown(cardId: string, e: React.KeyboardEvent) {
    if (mentionSuggest?.cardId === cardId && mentionCandidatesLive.length > 0) {
      const n = mentionCandidatesLive.length;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionSuggest((s) => (s ? { ...s, pick: (s.pick + 1) % n } : null));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionSuggest((s) => (s ? { ...s, pick: (s.pick - 1 + n) % n } : null));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pickMentionCandidate(mentionCandidatesLive[mentionSuggest.pick]!);
        return;
      }
    }
    if (e.key === "Escape") {
      if (mentionSuggest?.cardId === cardId) {
        e.preventDefault();
        setMentionSuggest(null);
        return;
      }
      e.preventDefault();
      editorRefs.current[cardId]?.blur();
      setEditingCardId(null);
    }
  }

  async function exportStickerAsPng(cardId: string) {
    const dom = stickerEditorDom(cardId);
    const card = dom?.closest("[data-sticker-card='true']");
    if (!(card instanceof HTMLElement)) return;
    try {
      const shortId = cardId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12) || "sticker";
      const name = slug ? `retrogen-${slug}-${shortId}.png` : `retrogen-sticker-${shortId}.png`;
      const { copiedToClipboard } = await exportStickerCardToPng(card, name);
      setStickerSaveNotice(
        copiedToClipboard
          ? "PNG стикера скачан (текст, реакции, автор) и скопирован в буфер"
          : "PNG стикера скачан (текст, реакции, автор)",
      );
      if (stickerSaveNoticeTimerRef.current) clearTimeout(stickerSaveNoticeTimerRef.current);
      stickerSaveNoticeTimerRef.current = setTimeout(() => setStickerSaveNotice(null), 2800);
    } catch (err) {
      console.warn("[sticker PNG export]", err);
      setStickerSaveNotice("Не удалось экспортировать PNG (см. консоль F12)");
      if (stickerSaveNoticeTimerRef.current) clearTimeout(stickerSaveNoticeTimerRef.current);
      stickerSaveNoticeTimerRef.current = setTimeout(() => setStickerSaveNotice(null), 2800);
    }
  }

  function beginPan(event: React.MouseEvent) {
    if (event.button !== 1) return;
    event.preventDefault();
    panRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: boardOffset.x,
      startOffsetY: boardOffset.y,
    };
  }

  function beginEntityDrag(
    event: React.MouseEvent,
    entity: { kind: "block" | "card"; id: string; blockId?: string; left: number; top: number; width: number; height: number },
    mode: "move" | "resize",
    corner: "nw" | "ne" | "sw" | "se" = "se",
    activateEditOnClick = false,
  ) {
    if (event.button !== 0) return;
    if (boardFrozen) return;
    const isLocked = entity.kind === "block" ? blockMeta[entity.id]?.locked : cardMeta[entity.id]?.locked;
    if (isLocked) return;
    if (mode === "move") {
      const target = event.target as HTMLElement | null;
      if (target?.closest("button,input,textarea,select,a,[data-sticker-editor='true'],[data-no-drag='true']")) return;
    }
    if (entity.kind === "block") {
      // Prevent click-to-place from firing after block drag end in "block in hand" mode.
      suppressNextBoardClickRef.current = true;
    }
    event.preventDefault();
    event.stopPropagation();
    if (entity.kind === "card") {
      setSelectedMemeId(null);
      setSelectedGadgetId(null);
      setSelectedShapeId(null);
    }
    if (entity.kind === "block") {
      setSelectedShapeId(null);
    }
    dragRef.current = {
      kind: entity.kind,
      id: entity.id,
      blockId: entity.blockId,
      mode,
      corner,
      moved: false,
      activateEditOnClick,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: entity.left,
      startTop: entity.top,
      startWidth: entity.width,
      startHeight: entity.height,
    };
  }

  function openContextMenu(event: React.MouseEvent, kind: "block" | "card", id: string) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ kind, id, x: event.clientX, y: event.clientY, mode: "menu" });
  }

  function toggleLock(kind: "block" | "card", id: string) {
    if (kind === "block") {
      setBlockMeta((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { z: 100, locked: false }), locked: !(prev[id]?.locked ?? false) } }));
    } else {
      setCardMeta((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { z: 200, locked: false }), locked: !(prev[id]?.locked ?? false) } }));
    }
    setContextMenu(null);
  }

  function bringToFront(kind: "block" | "card", id: string) {
    const snap = planeSnapshotRef.current;
    const globalMaxZ =
      maxLayerZ({
        blockMeta: snap.blockMeta,
        cardMeta: snap.cardMeta,
        gadgets: snap.gadgets,
        shapes: snap.planeShapes,
      }) + 1;
    if (kind === "block") {
      setBlockMeta((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { locked: false, z: 10 }), z: globalMaxZ } }));
    } else {
      setCardMeta((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { locked: false, z: 100 }), z: globalMaxZ } }));
    }
    setContextMenu(null);
  }

  function sendToBack(kind: "block" | "card", id: string) {
    const snap = planeSnapshotRef.current;
    const globalMinZ =
      minLayerZ({
        blockMeta: snap.blockMeta,
        cardMeta: snap.cardMeta,
        gadgets: snap.gadgets,
        shapes: snap.planeShapes,
      }) - 1;
    if (kind === "block") {
      setBlockMeta((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { locked: false, z: 10 }), z: globalMinZ } }));
    } else {
      setCardMeta((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { locked: false, z: 100 }), z: globalMinZ } }));
    }
    setContextMenu(null);
  }

  function contextMenuHexOrDefault(): string {
    if (!contextMenu) return "#ffffff";
    const raw =
      contextMenu.kind === "card"
        ? cardStyles[contextMenu.id]?.backgroundColor?.trim()
        : blockStyles[contextMenu.id]?.backgroundColor?.trim();
    if (raw && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return raw;
    return isLight ? "#ffffff" : "#1e293b";
  }

  function applyContextBgColor(color: string) {
    if (!contextMenu) return;
    const id = contextMenu.id;
    if (contextMenu.kind === "card") {
      setCardStyles((prev) => {
        const next = { ...prev };
        if (!color) delete next[id];
        else next[id] = { ...next[id], backgroundColor: color };
        return next;
      });
    } else {
      setBlockStyles((prev) => {
        const next = { ...prev };
        if (!color) delete next[id];
        else next[id] = { ...next[id], backgroundColor: color };
        return next;
      });
    }
    setContextMenu(null);
  }

  async function deleteFromContextMenu() {
    if (!contextMenu || !slug || !room) return;
    if (contextMenu.kind === "card") {
      const cardId = contextMenu.id;
      const snapshot = room.cards;
      setRoom((prev) => (prev ? { ...prev, cards: prev.cards.filter((c) => c.id !== cardId) } : prev));
      setCardLayouts((prev) => {
        const next = { ...prev };
        delete next[cardId];
        return next;
      });
      setCardMeta((prev) => {
        const next = { ...prev };
        delete next[cardId];
        return next;
      });
      setCardStyles((prev) => {
        if (!(cardId in prev)) return prev;
        const next = { ...prev };
        delete next[cardId];
        return next;
      });
      setCardTags((prev) => {
        if (!(cardId in prev)) return prev;
        const next = { ...prev };
        delete next[cardId];
        return next;
      });
      removeConnectionsForCard(cardId);
      setSelectedCardId((prev) => (prev === cardId ? null : prev));
      setContextMenu(null);
      if (cardId.startsWith("tmp-")) {
        return;
      }
      try {
        await deleteCard(slug, cardId);
      } catch {
        setRoom((prev) => (prev ? { ...prev, cards: snapshot } : prev));
      }
      return;
    }

    const blockId = contextMenu.id;
    const snapshotBlocks = room.blocks;
    const snapshotCards = room.cards;
    setRoom((prev) =>
      prev
        ? {
            ...prev,
            blocks: prev.blocks.filter((b) => b.id !== blockId),
            cards: prev.cards.filter((c) => c.blockId !== blockId),
          }
        : prev,
    );
    setBlockLayouts((prev) => {
      const next = { ...prev };
      delete next[blockId];
      return next;
    });
    setBlockMeta((prev) => {
      const next = { ...prev };
      delete next[blockId];
      return next;
    });
    setBlockStyles((prev) => {
      if (!(blockId in prev)) return prev;
      const next = { ...prev };
      delete next[blockId];
      return next;
    });
    setContextMenu(null);
    try {
      await deleteBlock(slug, blockId);
    } catch {
      setRoom((prev) => (prev ? { ...prev, blocks: snapshotBlocks, cards: snapshotCards } : prev));
    }
  }

  function beginHelpDrag(event: React.MouseEvent) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button,a,input,textarea,select")) return;
    event.preventDefault();
    event.stopPropagation();
    helpDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: helpPos.x,
      startTop: helpPos.y,
    };
  }

  function beginToolbarDrag(event: React.MouseEvent) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-toolbar-action='true']")) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = toolbarRef.current?.getBoundingClientRect();
    const fallbackTop = Math.max(8, (boardViewportRef.current?.clientHeight ?? window.innerHeight) / 2 - 90);
    toolbarDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: leftMenuPos?.x ?? (rect?.left ?? 16),
      startTop: leftMenuPos?.y ?? (rect?.top ?? fallbackTop),
    };
  }

  function onBoardWheel(event: React.WheelEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-sticker-editor='true']") || target?.closest("[data-help-overlay='true']")) {
      return;
    }
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.05 : -0.05;
    const fitScale = Math.min(
      (viewportSize.width || window.innerWidth) / BOARD_WIDTH,
      (viewportSize.height || window.innerHeight) / BOARD_HEIGHT,
    );
    const minScale = Math.max(0.01, Number((fitScale * 0.95).toFixed(4)));
    const nextScale = Math.min(2, Math.max(minScale, Number((boardScale + delta).toFixed(4))));
    if (nextScale === boardScale) return;

    const viewportRect = boardViewportRef.current?.getBoundingClientRect();
    const viewportLeft = viewportRect?.left ?? 0;
    const viewportTop = viewportRect?.top ?? 0;
    const cursorX = event.clientX - viewportLeft;
    const cursorY = event.clientY - viewportTop;

    // Keep world point under cursor fixed while scaling (Miro-like zoom).
    const worldX = (cursorX - boardOffset.x) / boardScale;
    const worldY = (cursorY - boardOffset.y) / boardScale;
    const nextOffsetX = cursorX - worldX * nextScale;
    const nextOffsetY = cursorY - worldY * nextScale;

    setBoardScale(nextScale);
    setBoardOffset({ x: nextOffsetX, y: nextOffsetY });
  }

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const pan = panRef.current;
      if (pan) {
        const dx = event.clientX - pan.startX;
        const dy = event.clientY - pan.startY;
        setBoardOffset({ x: pan.startOffsetX + dx, y: pan.startOffsetY + dy });
      }
      const drag = dragRef.current;
      if (!drag) return;
      if (Math.abs(event.clientX - drag.startX) > 2 || Math.abs(event.clientY - drag.startY) > 2) {
        dragRef.current = { ...drag, moved: true };
      }
      const blockForCard = drag.blockId ? room?.blocks.find((b) => b.id === drag.blockId) : null;
      const baseForCard = blockForCard ? getBaseBlockSize(blockForCard.kind) : { width: 1, height: 1 };
      const layoutForCard = drag.blockId ? blockLayouts[drag.blockId] : null;
      const cardScale =
        drag.kind === "card" && layoutForCard
          ? Math.min(layoutForCard.width / baseForCard.width, layoutForCard.height / baseForCard.height)
          : 1;
      const dx = (event.clientX - drag.startX) / (boardScale * cardScale);
      const dy = (event.clientY - drag.startY) / (boardScale * cardScale);
      if (drag.kind === "block") {
        const cur = blockLayouts[drag.id];
        if (!cur) return;
        const next = computeNextBlockLayoutForDrag(drag, cur, dx, dy);
        setBlockLayouts((prev) => ({ ...prev, [drag.id]: next }));
        if (!drag.id.startsWith("tmp-")) {
          tryEmitPlaneLivePreview(
            socketRef.current,
            slug,
            boardFrozenRef.current,
            planeLiveThrottleUntilRef,
            { blockLayouts: { [drag.id]: next } },
          );
        }
      } else {
        const cur = cardLayouts[drag.id];
        if (!cur) return;
        const next = computeNextCardLayoutForDrag(drag, cur, dx, dy);
        setCardLayouts((prev) => ({ ...prev, [drag.id]: next }));
        if (drag.id.startsWith("tmp-")) return;
        tryEmitPlaneLivePreview(
          socketRef.current,
          slug,
          boardFrozenRef.current,
          planeLiveThrottleUntilRef,
          { cardLayouts: { [drag.id]: next } },
        );
      }
    };
    const onMouseUp = () => {
      const drag = dragRef.current;
      if (drag?.moved && (drag.kind === "block" || drag.kind === "card")) {
        planeDragEndedFlushRef.current = true;
        setPlaneSaveBump((n) => n + 1);
      }
      if (drag?.moved) {
        suppressNextBoardClickRef.current = true;
      }
      if (drag && drag.kind === "card" && room && slug && drag.moved) {
        const layout = cardLayouts[drag.id];
        if (layout && !drag.id.startsWith("tmp-")) {
          const c = room.cards.find((x) => x.id === drag.id);
          void updateCard(slug, drag.id, {
            row: Math.round(layout.y),
            col: Math.round(layout.x),
            expectedUpdatedAt: c?.updatedAt,
          }).catch(() => {
            /* ignore */
          });
        }
      }
      if (drag && drag.kind === "card" && drag.mode === "move") {
        if (drag.activateEditOnClick && !drag.moved) {
          if (selectedCardId === drag.id) {
            setEditingCardId(drag.id);
            const currentCard = room?.cards.find((c) => c.id === drag.id);
            if (currentCard) {
              setEditDrafts((prev) => ({ ...prev, [drag.id]: currentCard.text }));
            }
          } else {
            setSelectedCardId(drag.id);
          }
        } else if (drag.moved) {
          setSelectedCardId(drag.id);
        }
      }
      panRef.current = null;
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [boardScale, blockLayouts, cardLayouts, room, selectedCardId, slug]);

  useEffect(() => {
    if (!editingCardId) return;
    const id = editingCardId;
    window.setTimeout(() => {
      const api = editorRefs.current[id];
      if (!api) return;
      if (!stickerCollabProvider) {
        const currentDraft = editDrafts[id] ?? room?.cards.find((c) => c.id === id)?.text ?? "";
        const normalized = currentDraft?.trim() ? currentDraft : "<p></p>";
        if (api.getHtml() !== normalized) {
          api.setHtml(normalized);
        }
      }
      api.focus();
    }, 0);
    // Синхронизируем DOM и каретку только при входе в режим редактирования, иначе каждое обновление
    // черновика сбрасывало выделение и ломало тулбар/набор текста.
    // При Yjs collab содержимое приходит из CRDT, не из editDrafts.
  }, [editingCardId, stickerCollabProvider]);

  useEffect(() => {
    setStickerEditorMono(false);
    setStickerEditorBreakAll(false);
    setStickerEmojiOpen(false);
    setStickerLinkOpen(false);
  }, [editingCardId]);

  useEffect(() => {
    if (!editingCardId) {
      setFormatToolbarPos(null);
      return;
    }
    const recalc = () => {
      const editor = stickerEditorDom(editingCardId);
      if (!editor) return;
      const rect = editor.getBoundingClientRect();
      const width = Math.min(920, typeof window !== "undefined" ? window.innerWidth - 24 : 920);
      setFormatToolbarPos({
        x: Math.max(12, rect.left + rect.width / 2 - width / 2),
        y: Math.max(8, rect.top - 72),
      });
    };
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [editingCardId, boardScale, boardOffset, blockLayouts, cardLayouts]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-context-menu='true']")) return;
      setContextMenu(null);
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!helpMinimized) {
          if (helpExpanded) {
            setHelpExpanded(false);
            event.preventDefault();
            return;
          }
          setHelpMinimized(true);
          event.preventDefault();
          return;
        }
        setContextMenu(null);
        setPendingStickerPlacement(false);
        setPendingStickerPos(null);
        setPendingBlockKind(null);
        setPendingBlockPos(null);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [helpMinimized, helpExpanded]);

  useEffect(() => {
    const onDeleteKey = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input,textarea,select,[contenteditable='true']") ||
        editingCardId
      ) {
        return;
      }

      if (selectedCardId && slug && room) {
        event.preventDefault();
        const cardId = selectedCardId;
        const snapshot = room.cards;
        setRoom((prev) => (prev ? { ...prev, cards: prev.cards.filter((c) => c.id !== cardId) } : prev));
        setCardLayouts((prev) => {
          const next = { ...prev };
          delete next[cardId];
          return next;
        });
        setCardMeta((prev) => {
          const next = { ...prev };
          delete next[cardId];
          return next;
        });
        setSelectedCardId(null);
        if (cardId.startsWith("tmp-")) return;
        void deleteCard(slug, cardId).catch(() => {
          setRoom((prev) => (prev ? { ...prev, cards: snapshot } : prev));
        });
        return;
      }

      if (selectedGadgetId) {
        event.preventDefault();
        removeGadget(selectedGadgetId);
        return;
      }

      if (selectedShapeId) {
        event.preventDefault();
        setPlaneShapes((prev) => prev.filter((s) => s.id !== selectedShapeId));
        setSelectedShapeId(null);
        return;
      }

      if (selectedMemeId) {
        event.preventDefault();
        removeMeme(selectedMemeId);
      }
    };

    window.addEventListener("keydown", onDeleteKey);
    return () => window.removeEventListener("keydown", onDeleteKey);
  }, [selectedCardId, selectedMemeId, selectedGadgetId, selectedShapeId, editingCardId, slug, room]);

  useEffect(() => {
    if (!room) return;
    if (applyingHistoryRef.current) return;
    const snapshot = buildViewSnapshot();
    setViewHistoryPast((past) => {
      if (past.length === 0) return [snapshot];
      const prev = past[past.length - 1];
      if (JSON.stringify(prev) === JSON.stringify(snapshot)) return past;
      return [...past, snapshot].slice(-120);
    });
    setViewHistoryFuture([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, boardScale, boardOffset, blockLayouts, cardLayouts, memes, gadgets, cardStyles, blockStyles, planeShapes]);

  useEffect(() => {
    const onUndoRedo = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input,textarea,select,[contenteditable='true']")) return;
      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undoViewAction();
        return;
      }
      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redoViewAction();
      }
    };
    window.addEventListener("keydown", onUndoRedo);
    return () => window.removeEventListener("keydown", onUndoRedo);
  }, []);

  useEffect(() => {
    if (!slug || !participantKey) return;
    try {
      const raw = localStorage.getItem(`${LEFT_MENU_POS_KEY_PREFIX}:${slug}:${participantKey}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { x?: number; y?: number };
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        setLeftMenuPos({ x: parsed.x, y: parsed.y });
      }
    } catch {
      /* ignore */
    }
  }, [slug, participantKey]);

  useEffect(() => {
    if (!slug || !participantKey || !leftMenuPos) return;
    try {
      localStorage.setItem(
        `${LEFT_MENU_POS_KEY_PREFIX}:${slug}:${participantKey}`,
        JSON.stringify(leftMenuPos),
      );
    } catch {
      /* ignore */
    }
  }, [slug, participantKey, leftMenuPos]);

  useEffect(() => {
    const viewport = boardViewportRef.current;
    const updateViewportSize = () => {
      const el = boardViewportRef.current;
      setViewportSize({
        width: el?.clientWidth ?? window.innerWidth,
        height: el?.clientHeight ?? window.innerHeight,
      });
    };
    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);
    const ro =
      typeof ResizeObserver !== "undefined" && viewport
        ? new ResizeObserver(() => {
            updateViewportSize();
          })
        : null;
    if (viewport && ro) ro.observe(viewport);
    return () => {
      window.removeEventListener("resize", updateViewportSize);
      ro?.disconnect();
    };
  }, [room?.id, boardFrozen]);

  useEffect(() => {
    return () => {
      if (stickerSaveNoticeTimerRef.current) clearTimeout(stickerSaveNoticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const drag = toolbarDragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      setLeftMenuPos({ x: Math.max(8, drag.startLeft + dx), y: Math.max(8, drag.startTop + dy) });
    };
    const onMouseUp = () => {
      toolbarDragRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const drag = helpDragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      setHelpPos({ x: Math.max(8, drag.startLeft + dx), y: Math.max(8, drag.startTop + dy) });
    };
    const onMouseUp = () => {
      helpDragRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function dismissEndedWelcome() {
    if (!slug) return;
    try {
      localStorage.setItem(`${ENDED_WELCOME_DISMISS_KEY_PREFIX}${slug}`, "1");
    } catch {
      /* ignore */
    }
    setEndedWelcomeOpen(false);
  }

  if (!slug) {
    navigate("/home");
    return null;
  }

  if (roomPasswordRequired) {
    return (
      <div className={`min-h-screen px-6 py-16 ${isLight ? "bg-zinc-100 text-zinc-900" : "bg-zinc-950 text-zinc-100"}`}>
        <div className="mx-auto max-w-lg">
          <RoomPasswordGate
            slug={slug}
            isLight={isLight}
            onUnlocked={() => {
              setRoomPasswordRequired(false);
              setUnlockRevision((x) => x + 1);
              void load();
            }}
          />
          <button
            type="button"
            className={`mt-6 text-sm underline ${isLight ? "text-sky-700" : "text-sky-400"}`}
            onClick={() => navigate("/home")}
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <p className="text-red-400">{loadError}</p>
        <button type="button" className="mt-4 text-sky-400 underline" onClick={() => navigate("/home")}>
          На главную
        </button>
      </div>
    );
  }

  if (!room || !themePack) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <p className="text-zinc-400">Загрузка…</p>
      </div>
    );
  }

  const palette = themePack.palette;
  const freeCanvasBlockIds = new Set(
    room.blocks.filter((b) => b.kind === FREE_CANVAS_BLOCK_KIND).map((b) => b.id),
  );

  const helpDocBody = (
    <>
      <p>
        <strong>Навигация по доске:</strong> колесо мыши — масштаб в точку курсора; средняя кнопка или жест — панорама (если включено в системе).
        Ссылка <strong>«← На главную»</strong> в шапке ведёт на список комнат и создание нового ретро.
      </p>
      <div>
        <p className={`font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>Стикеры (до редактирования)</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Один клик — выделить стикер; второй клик по выделенному — открыть текстовый редактор и панель форматирования над стикером.</li>
          <li>Клик по пустому месту доски — снять выделение и закрыть редактирование (текст сохранится).</li>
          <li>
            Под текстом — <strong>реакции</strong> (эмодзи): один голос на тип реакции от участника; повторный клик снимает голос. Счётчики синхронизируются у всех в реальном времени.
          </li>
        </ul>
      </div>
      <div>
        <p className={`font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>Панель редактора стикера — начертание</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <strong>B</strong> — жирный, <strong>I</strong> — курсив, <strong>U</strong> — подчёркивание, <strong>S</strong> — зачёркивание.
          </li>
          <li>
            <strong>xⁿ</strong> — надстрочный текст, <strong>xₙ</strong> — подстрочный.
          </li>
        </ul>
      </div>
      <div>
        <p className={`font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>Панель — отмена действий панели</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <strong>↶</strong> — отменить последнее действие через панель (форматирование, цвета, вставки блоков и т.д.).
          </li>
          <li>
            <strong>↷</strong> — вернуть отменённое.
          </li>
          <li>
            Обычный набор текста в поле стикера отменяется стандартным{' '}
            <kbd className="rounded border border-current px-1 py-0.5 font-mono text-[10px]">Ctrl</kbd>+
            <kbd className="rounded border border-current px-1 py-0.5 font-mono text-[10px]">Z</kbd> /{' '}
            <kbd className="rounded border border-current px-1 py-0.5 font-mono text-[10px]">Cmd</kbd>+
            <kbd className="rounded border border-current px-1 py-0.5 font-mono text-[10px]">Z</kbd> в самом редакторе. При фокусе в поле комбинации отмены <strong>вида доски</strong> не перехватываются.
          </li>
        </ul>
      </div>
      <div>
        <p className={`font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>Панель — ссылки</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <strong>URL</strong> — вставить гиперссылку на выделенный фрагмент или в позиции курсора (по запросу вводится адрес https://…).
          </li>
          <li>
            <strong>×сс</strong> — снять ссылку с выделения (unlink).
          </li>
          <li>
            В тексте стикера: <strong>Ctrl+клик</strong> (Windows/Linux) или <strong>Cmd+клик</strong> (macOS) по ссылке — открыть в новой вкладке.
          </li>
        </ul>
      </div>
      <div>
        <p className={`font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>Панель — копирование стиля и регистр</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <strong>кФ</strong> — запомнить оформление символа в точке начала выделения (шрифт, цвет, начертание).
          </li>
          <li>
            <strong>вФ</strong> — применить запомненное оформление к текущему выделению.
          </li>
          <li>
            <strong>оч</strong> — убрать форматирование и ссылки с выделения.
          </li>
          <li>
            <strong>AA</strong> — весь выделенный фрагмент ЗАГЛАВНЫМИ; <strong>aa</strong> — строчными; <strong>Aa</strong> — с заглавной буквы в стиле предложения.
          </li>
        </ul>
      </div>
      <div>
        <p className={`font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>Панель — блоки внутри стикера</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <strong>«»</strong> — оформить абзац как цитату (blockquote).
          </li>
          <li>
            <strong>{`{ }`}</strong> — вставить блок кода (моноширинный, с рамкой).
          </li>
          <li>
            <strong>─</strong> — горизонтальная линия-разделитель.
          </li>
          <li>
            <strong>T</strong> — вставить <em>только текст</em> из буфера обмена, без HTML-форматирования (нужны разрешения браузера на чтение буфера).
          </li>
          <li>
            <strong>Ctrl+V</strong> / <strong>Cmd+V</strong> в поле стикера: если в буфере есть форматированный HTML (например из Word), вставляется <strong>простой текст</strong> без стилей источника.
          </li>
        </ul>
      </div>
      <div>
        <p className={`font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>Панель — цвет и шрифт</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <strong>A</strong> + квадрат цвета — цвет текста для выделения (или далее набираемого текста).
          </li>
          <li>
            <strong>Hl</strong> + квадрат — цвет подсветки фона выделения (как маркер).
          </li>
          <li>
            Списки <strong>Шрифт</strong> и <strong>Размер</strong> — гарнитура и размер в пикселях для выделенного текста (размер не задаётся для всего стикера сразу).
          </li>
          <li>
            Рядом с цветами показывается <strong>оценка контраста</strong> между цветом текста и маркера (если ниже ~3∶1 — предупреждение; для реального текста учитывайте и фон стикера).
          </li>
          <li>
            Кнопка <strong>😊</strong> — эмодзи (сначала недавние). При сохранении <code>:smile:</code>, <code>:fire:</code> и др. превращаются в символы.
            <br />
            <strong>URL</strong> — строка в панели (без отдельного окна): вставка или правка ссылки по выделению.
          </li>
        </ul>
      </div>
      <div>
        <p className={`font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>Панель — списки, таблица, колонки</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <strong>•</strong> — маркированный список; <strong>1.</strong> — нумерованный.
          </li>
          <li>
            <strong>→|</strong> — увеличить отступ списка; <strong>|←</strong> — уменьшить.
          </li>
          <li>
            <strong>⊞</strong> — вставить таблицу 2×2 с границами.
          </li>
          <li>
            <strong>+стр</strong>, <strong>−стр</strong> — добавить или удалить <strong>строку</strong> (курсор в ячейке таблицы в теле; строку в заголовке thead не удалить этой кнопкой).
          </li>
          <li>
            <strong>+стл</strong>, <strong>−стл</strong> — добавить столбец справа или удалить текущий столбец (не удалится последний столбец).
          </li>
          <li>
            <strong>║2</strong>, <strong>║3</strong> — вставить блок с двумя или тремя <strong>колонками текста</strong> внутри стикера.
          </li>
        </ul>
      </div>
      <div>
        <p className={`font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>Панель — вид текста в поле</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            Селект <strong>÷…</strong> — межстрочный интервал для всего текста в поле редактирования.
          </li>
          <li>
            Селект <strong>⊡…</strong> — внутренние отступы поля (пиксели от края стикера до текста).
          </li>
          <li>
            Селект <strong>¶0 / ¶1 / ¶2</strong> — дополнительный интервал <strong>между абзацами</strong> (между тегами абзаца).
          </li>
        </ul>
      </div>
      <div>
        <p className={`font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>Панель — сервис</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <strong>MD</strong> — скопировать содержимое стикера в буфер как упрощённый Markdown (таблицы и сложная вёрстка преобразуются грубо).
          </li>
          <li>
            <strong>PNG</strong> — снимок карточки стикера: ваш текст, эмодзи-реакции, имя автора, цвет фона и рамка (как на доске, без панели форматирования).
          </li>
          <li>
            После успешного сохранения стикера на сервер в панели может появиться сообщение «Сохранено на сервере».
          </li>
          <li>
            Если текст в стикере очень длинный (порядка сотен тысяч символов HTML), показывается предупреждение — лучше разбить содержимое на несколько стикеров.
          </li>
          <li>
            В поле включена <strong>проверка орфографии</strong> браузера (ошибки подчёркиваются так же, как в других полях на вашей системе).
          </li>
        </ul>
      </div>
      <div>
        <p className={`font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>Панель — переносы и моноширинный режим</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <strong>↵</strong> — переключить жёсткий перенос длинных слов (как в URL); подсветка рамкой, когда включено.
          </li>
          <li>
            <strong>¶</strong> — весь редактор стикера временно в моноширинном шрифте (удобнее видеть пробелы и структуру); подсветка при включении.
          </li>
        </ul>
      </div>
      <div>
        <p className={`font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>Панель — выравнивание текста в стикере</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <strong>L</strong>, <strong>C</strong>, <strong>R</strong> — выровнять абзац по левому краю, по центру, по правому.
          </li>
          <li>
            <strong>T</strong>, <strong>M</strong>, <strong>B</strong> — прижать блок текста к верху, центру или низу внутри прямоугольника стикера (при достаточной высоте).
          </li>
        </ul>
      </div>
      <div>
        <p className={`font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>Доска: перемещение и добавление</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Блоки и стикеры перетаскиваются мышью.</li>
          <li>
            Левая панель: блок, стикер, картинки, таймер, кнопка «шаблоны и схемы» (готовый текст стикера и рамки схем на плоскости). Новый стикер:
            клик по свободной плоскости или по зоне стикеров в блоке (не в разминке).
          </li>
          <li>Углы блока и стикера — изменение размера.</li>
        </ul>
      </div>
      <p>
        <strong>Контекстное меню (ПКМ)</strong> по блоку или стикеру: блокировка, цвет фона, «на передний план» / «на задний план» (слой между
        блоками, стикерами, рамками схемы и таймерами), удаление.
      </p>
      <p>
        <strong>Изображения на плоскости:</strong> вставка с буфера{' '}
        <kbd className="rounded border border-current px-1 py-0.5 font-mono text-xs">Ctrl</kbd>+
        <kbd className="rounded border border-current px-1 py-0.5 font-mono text-xs">V</kbd> /{' '}
        <kbd className="rounded border border-current px-1 py-0.5 font-mono text-xs">Cmd</kbd>+
        <kbd className="rounded border border-current px-1 py-0.5 font-mono text-xs">V</kbd>, либо кнопка загрузки слева.
        У выделенной картинки: поворот ↻ на 90° и <strong>подпись</strong> под изображением (сохраняется в состоянии плоскости).
      </p>
      <p>
        <strong>Таймер на доске:</strong> часы на левой панели — обратный отсчёт для всех участников.
        Удалить: выделить таймер и <strong>Delete</strong> или кнопку ✕.
      </p>
      <p>
        <strong>Рамки схем:</strong> вынесены на общую плоскость и участвуют в порядке слоёв вместе с блоками и стикерами. Перетаскивание —
        захват рамки; удаление — выделите кликом и нажмите Delete.
      </p>
      <p>
        <strong>История вида доски</strong> (масштаб, смещение, мемы и т.д.): сочетания в блоке «Зум плоскости» и{' '}
        <kbd className="rounded border border-current px-1 py-0.5 font-mono text-xs">Ctrl</kbd>/
        <kbd className="rounded border border-current px-1 py-0.5 font-mono text-xs">Cmd</kbd>+
        <kbd className="rounded border border-current px-1 py-0.5 font-mono text-xs">Z</kbd> /{' '}
        <kbd className="rounded border border-current px-1 py-0.5 font-mono text-xs">Y</kbd> — только когда фокус <strong>не</strong> в поле ввода и <strong>не</strong> в стикере; в поле стикера <kbd className="rounded border border-current px-1 py-0.5 font-mono text-xs">Ctrl</kbd>+
        <kbd className="rounded border border-current px-1 py-0.5 font-mono text-xs">Z</kbd> обычно отменяет набор текста.
      </p>
      <p>
        <strong>Esc</strong> — в полноэкранной справке сначала возвращает к маленькому окну, затем сворачивает справку в кнопку; иначе закрывает контекстное меню, отменяет
        режим «стикер/блок в руке», сбрасывает незавершённое размещение; в поле стикера — выход из редактирования.
      </p>
    </>
  );


  return (
    <div
      className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden overscroll-none"
      style={{
        background: profileFx.boardBackdrop
          ? profileFx.boardBackdrop
          : isLight
            ? "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)"
            : `linear-gradient(180deg, ${palette.bg} 0%, #0a0d12 100%)`,
        cursor: cursorCss(profileFx.cursorStyle),
      }}
    >
      {profileFx.wallpaperDataUrl ? (
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${profileFx.wallpaperDataUrl})` }}
          aria-hidden
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {memes.map((meme) => {
          const isSelected = selectedMemeId === meme.id;
          const rot = meme.rotation ?? 0;
          return (
            <div
              key={meme.id}
              className="pointer-events-auto absolute flex flex-col"
              style={{ left: meme.x, top: meme.y, width: meme.width }}
              onMouseDown={(e) => beginMemeDrag(e, meme, "move")}
            >
              <div className="relative" style={{ height: meme.height }}>
                <img
                  src={meme.src}
                  alt="meme"
                  draggable={false}
                  style={{ transform: `rotate(${rot}deg)` }}
                  className={`h-full w-full object-contain ${
                    isSelected ? "ring-2 ring-sky-500 ring-offset-2 ring-offset-transparent" : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMemeId(meme.id);
                    setSelectedGadgetId(null);
                    setSelectedShapeId(null);
                  }}
                />
                {isSelected && (
                  <>
                    <button
                      type="button"
                      className="absolute -right-2 -top-2 rounded bg-rose-600 px-1.5 py-0.5 text-[11px] text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMeme(meme.id);
                      }}
                      title="Удалить мем"
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      className="absolute -left-2 -top-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[11px] text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemes((prev) =>
                          prev.map((m) =>
                            m.id !== meme.id
                              ? m
                              : { ...m, rotation: ((((m.rotation ?? 0) + 90) % 360) + 360) % 360 },
                          ),
                        );
                      }}
                      title="Повернуть на 90°"
                    >
                      ↻
                    </button>
                    <button
                      type="button"
                      className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize rounded bg-sky-600"
                      onMouseDown={(e) => beginMemeDrag(e, meme, "resize")}
                      title="Изменить размер"
                    />
                  </>
                )}
              </div>
              {!isSelected && meme.caption ? (
                <div
                  className={`pointer-events-none mt-1 max-w-[280px] text-center text-[11px] leading-tight ${isLight ? "text-zinc-700" : "text-zinc-200"}`}
                >
                  {meme.caption}
                </div>
              ) : null}
              {isSelected && (
                <input
                  type="text"
                  placeholder="Подпись к картинке"
                  maxLength={200}
                  className={`mt-1 w-full rounded border px-1 py-0.5 text-[11px] ${isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-900 text-white"}`}
                  value={meme.caption ?? ""}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMemes((prev) => prev.map((m) => (m.id === meme.id ? { ...m, caption: v } : m)));
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <header
        className={`relative z-30 shrink-0 border-b px-6 py-4 backdrop-blur ${
          isLight ? "border-zinc-300 bg-white/70" : "border-white/10 bg-black/20"
        }`}
        style={profileFx.headerTint ? { backgroundColor: profileFx.headerTint } : undefined}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <Link
                to="/home"
                className={`text-sm font-medium underline-offset-2 hover:underline ${isLight ? "text-sky-700" : "text-sky-400"}`}
              >
                ← На главную
              </Link>
              <span
                className={`shrink-0 text-sm font-medium ${
                  roomSyncLine.tone === "ok"
                    ? isLight
                      ? "text-emerald-700"
                      : "text-emerald-400"
                    : roomSyncLine.tone === "error"
                      ? isLight
                        ? "text-red-700"
                        : "text-red-400"
                      : isLight
                        ? "text-amber-700"
                        : "text-amber-400"
                }`}
                title={roomSyncLine.title}
              >
                {roomSyncLine.text}
              </span>
            </div>
            {socket && !socketSessionLive && (socketSlowHint || socketConnectError) ? (
              <p className={`mt-1 max-w-2xl text-xs leading-snug ${isLight ? "text-amber-900/90" : "text-amber-200/90"}`}>
                {socketConnectError
                  ? `Ошибка канала: ${socketConnectError}`
                  : "Если так висит долго — чаще всего не запущен сервер API или в dev не проксируется /socket.io. Запустите бэкенд и обновите страницу."}
              </p>
            ) : null}
            <h1 className={`mt-0.5 text-xl font-semibold leading-snug ${isLight ? "text-zinc-900" : "text-white"}`}>
              Тема: {room.themeSanitized}
            </h1>
            <div className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
              <label className="flex flex-wrap items-center gap-2">
                <span className="shrink-0">Просмотр интерфейса:</span>
                <select
                  value={rolePreviewMode}
                  onChange={(e) => setRolePreviewMode(e.target.value as RoomRolePreviewMode)}
                  className={`max-w-[min(100%,16rem)] rounded border px-2 py-1 text-xs outline-none ring-sky-500/30 focus-visible:ring-2 ${
                    isLight ? "border-zinc-300 bg-white text-zinc-900" : "border-zinc-600 bg-zinc-900 text-zinc-100"
                  }`}
                  title="Не меняет права на сервере — только отключение кнопок фасилитатора в этом браузере"
                >
                  <option value="server">как у меня на сервере</option>
                  <option value="force-facilitator">как фасилитатор</option>
                  <option value="force-member">как участник</option>
                </select>
              </label>
              {rolePreviewMode !== "server" ? (
                <span className="opacity-80">(только отображение; серверные действия по-прежнему с вашими правами)</span>
              ) : null}
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={stickerFilterMine}
                  onChange={(e) => setStickerFilterMine(e.target.checked)}
                  className="rounded"
                />
                <span>Только мои стикеры</span>
              </label>
            </div>
            {boardFrozen ? (
              <p className={`mt-1 text-sm ${isLight ? "text-amber-800" : "text-amber-300"}`}>Ретро завершено · только просмотр</p>
            ) : null}
            <div
              className={`mt-2 flex min-h-[2.25rem] max-w-full flex-nowrap items-center gap-2 overflow-x-auto text-sm ${
                isLight ? "text-zinc-600" : "text-zinc-400"
              }`}
            >
              <span className="shrink-0 font-medium text-inherit">Комната</span>
              <span
                className={`min-w-0 truncate font-medium ${isLight ? "text-zinc-900" : "text-zinc-100"}`}
                title={roomShareUrl}
              >
                {room.themeSanitized}
              </span>
              <div className="relative shrink-0">
                {copyTipPlacement === "header" ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium shadow-lg ${
                      isLight ? "border border-zinc-200 bg-white text-emerald-800" : "border border-zinc-600 bg-zinc-800 text-emerald-300"
                    }`}
                  >
                    Скопировано
                  </div>
                ) : null}
                <button
                  type="button"
                  className={`rounded p-2 text-sm ${isLight ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-900"}`}
                  title="Скопировать ссылку"
                  aria-label="Скопировать ссылку на комнату"
                  onClick={() => void copyRoomShareUrl("header")}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="8" y="8" width="12" height="12" rx="2" />
                    <path d="M8 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                className={`shrink-0 rounded p-2 text-sm ${isLight ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-900"}`}
                title="Поделиться (контакты и диалоги — позже)"
                aria-label="Поделиться комнатой"
                onClick={() => setShareRoomDialogOpen(true)}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="M8.59 13.51l6.83 3.98M15.42 6.49l-6.82 3.98" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {canFacilitate ? (
              <div
                className={`mt-3 max-w-xl rounded-lg border p-3 text-xs ${
                  isLight ? "border-zinc-200 bg-zinc-50/90 text-zinc-800" : "border-zinc-600 bg-zinc-900/80 text-zinc-200"
                }`}
              >
                <button
                  type="button"
                  className={`font-medium underline-offset-2 hover:underline ${isLight ? "text-sky-800" : "text-sky-300"}`}
                  onClick={() => setFacAccessOpen((o) => !o)}
                >
                  {facAccessOpen ? "▼" : "▶"} Доступ: лобби и пароль
                </button>
                {facAccessOpen ? (
                  <div className="mt-2 space-y-2">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={facListed}
                        onChange={(e) => setFacListed(e.target.checked)}
                        className="rounded border-zinc-400"
                      />
                      Показывать комнату в общем лобби (поиск на главной)
                    </label>
                    <label className="block">
                      <span className="opacity-90">Новый пароль входа (оставьте пустым, чтобы не менять)</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        disabled={facClearPw}
                        value={facNewPw}
                        onChange={(e) => setFacNewPw(e.target.value)}
                        className={`mt-1 w-full max-w-xs rounded border px-2 py-1 outline-none ring-sky-500/30 focus-visible:ring-2 ${
                          isLight ? "border-zinc-300 bg-white text-zinc-900" : "border-zinc-500 bg-zinc-950 text-zinc-100"
                        }`}
                      />
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={facClearPw}
                        disabled={!room.hasJoinPassword}
                        onChange={(e) => setFacClearPw(e.target.checked)}
                        className="rounded border-zinc-400"
                      />
                      Снять пароль с комнаты
                    </label>
                    {facMsg ? <p className={facMsg === "Сохранено" ? "text-emerald-600" : "text-amber-600"}>{facMsg}</p> : null}
                    <button
                      type="button"
                      disabled={facSaving}
                      onClick={() => void saveFacilitatorAccess()}
                      className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                    >
                      {facSaving ? "Сохранение…" : "Сохранить"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeCornersIconButtons
              isLight={isLight}
              isRounded={isRounded}
              toggleTheme={toggleTheme}
              toggleCorners={toggleCorners}
            />
            <button
              type="button"
              className={`rounded p-2 text-sm ${isLight ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-900"}`}
              onClick={() => {
                setAboutOpen(false);
                if (helpMinimized) {
                  setHelpExpanded(false);
                  setHelpMinimized(false);
                } else {
                  setHelpMinimized(true);
                }
              }}
              title={helpMinimized ? "Открыть справку" : "Скрыть справку"}
              aria-label={helpMinimized ? "Открыть справку" : "Скрыть справку"}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.5 9a2.5 2.5 0 1 1 3.7 2.2c-.8.45-1.2.95-1.2 1.8v.5" />
                <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <button
              type="button"
              className={`rounded p-2 text-sm ${isLight ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-900"} ${
                !canFacilitate ? "opacity-40" : ""
              }`}
              disabled={!canFacilitate}
              onClick={() => void resetBoardPlane()}
              title={
                canFacilitate
                  ? "Сбросить комнату к дефолту"
                  : "Сброс только у владельца / фасилитатора комнаты (войдите в нужный аккаунт)"
              }
              aria-label="Сбросить комнату к дефолту"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
              </svg>
            </button>
            {slug ? (
              <Link
                to={`/r/${slug}/summary`}
                className={`rounded p-2 text-sm no-underline ${isLight ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-200 text-zinc-900 hover:bg-white"}`}
                title="Отчёт"
                aria-label="Отчёт"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 3v18h18" strokeLinecap="round" />
                  <path d="M7 16V9M12 16V6M17 16v-5" strokeLinecap="round" />
                </svg>
              </Link>
            ) : null}
            {room && room.status !== "ended" ? (
              <button
                type="button"
                className={`rounded p-2 text-sm ${isLight ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-900"} ${
                  !canFacilitate ? "opacity-40" : ""
                }`}
                disabled={!canFacilitate}
                onClick={() => void onEndRetro()}
                title={
                  canFacilitate
                    ? "Завершить ретро и открыть отчёт"
                    : "Завершение только у владельца / фасилитатора (войдите в нужный аккаунт)"
                }
                aria-label="Завершить ретро"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="7" y="7" width="10" height="10" rx="1.5" />
                </svg>
              </button>
            ) : null}
            <RetrogenOverflowMenu
              isLight={isLight}
              onAbout={() => setAboutOpen(true)}
              authVariant={authMe ? "user" : "guest"}
              showLobbyLink={false}
              teamRoomSlug={serverCanFacilitate && slug ? slug : null}
              onLogout={() => {
                logoutAccount();
                setAuthMe(null);
                navigate("/", { replace: true });
              }}
            />
          </div>
        </div>
      </header>

      {endedWelcomeOpen && boardFrozen && slug ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ended-retro-welcome-title"
        >
          <div
            className={`max-w-md rounded-xl border p-6 shadow-2xl ${
              isLight ? "border-zinc-200 bg-white" : "border-zinc-600 bg-zinc-900"
            }`}
          >
            <p className={`text-xs font-semibold uppercase tracking-wide ${isLight ? "text-amber-700" : "text-amber-400"}`}>
              Ретро завершено
            </p>
            <h2 id="ended-retro-welcome-title" className={`mt-2 text-xl font-semibold ${isLight ? "text-zinc-900" : "text-white"}`}>
              «{room.themeSanitized}»
            </h2>
            <p className={`mt-3 text-sm leading-snug ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
              Доска доступна только для просмотра. Можно открыть сводку отчёта, вернуться в лобби со списком комнат или закрыть это окно и просматривать плоскость.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                to={`/r/${slug}/summary`}
                onClick={() => dismissEndedWelcome()}
                className={`inline-flex flex-1 justify-center rounded-lg px-4 py-2.5 text-center text-sm font-medium text-white no-underline ${
                  isLight ? "bg-violet-600 hover:bg-violet-700" : "bg-violet-500 hover:bg-violet-400"
                }`}
              >
                Открыть отчёт
              </Link>
              <Link
                to="/home"
                onClick={() => dismissEndedWelcome()}
                className={`inline-flex flex-1 justify-center rounded-lg border px-4 py-2.5 text-center text-sm font-medium no-underline ${
                  isLight ? "border-zinc-300 text-zinc-900 hover:bg-zinc-50" : "border-zinc-500 text-zinc-100 hover:bg-zinc-800"
                }`}
              >
                На главную
              </Link>
              <button
                type="button"
                onClick={() => dismissEndedWelcome()}
                className={`inline-flex flex-1 justify-center rounded-lg px-4 py-2.5 text-sm font-medium ${
                  isLight ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                }`}
              >
                Смотреть доску
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {shareRoomDialogOpen ? (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-room-dialog-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShareRoomDialogOpen(false);
          }}
        >
          <div
            className={`max-w-md rounded-xl border p-6 shadow-2xl ${
              isLight ? "border-zinc-200 bg-white" : "border-zinc-600 bg-zinc-900"
            }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 id="share-room-dialog-title" className={`text-lg font-semibold ${isLight ? "text-zinc-900" : "text-white"}`}>
              Поделиться комнатой
            </h2>
            <p className={`mt-3 text-sm leading-snug ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
              В следующих версиях здесь появится отправка ссылки <strong>внутри Retrogen</strong>: контакты, поиск людей, диалоги и сопутствующие сценарии
              (включая звонки). Пока можно скопировать ссылку и передать её любым способом вне приложения.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <div className="relative flex-1 sm:flex-none">
                {copyTipPlacement === "dialog" ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium shadow-lg ${
                      isLight ? "border border-zinc-200 bg-white text-emerald-800" : "border border-zinc-600 bg-zinc-800 text-emerald-300"
                    }`}
                  >
                    Скопировано
                  </div>
                ) : null}
                <button
                  type="button"
                  className={`inline-flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white ${
                    isLight ? "bg-sky-600 hover:bg-sky-700" : "bg-sky-500 hover:bg-sky-400"
                  }`}
                  onClick={() => void copyRoomShareUrl("dialog")}
                >
                  Скопировать ссылку
                </button>
              </div>
              <button
                type="button"
                className={`inline-flex flex-1 justify-center rounded-lg border px-4 py-2.5 text-sm font-medium sm:flex-none ${
                  isLight ? "border-zinc-300 text-zinc-900 hover:bg-zinc-50" : "border-zinc-500 text-zinc-100 hover:bg-zinc-800"
                }`}
                onClick={() => setShareRoomDialogOpen(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {boardFrozen ? (
        <div
          className={`shrink-0 border-b px-6 py-3 ${
            isLight ? "border-amber-300 bg-amber-100 text-amber-950" : "border-amber-600 bg-amber-950/60 text-amber-50"
          }`}
        >
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2 text-center text-sm">
            <span className="text-lg leading-none" aria-hidden="true">
              ✓
            </span>
            <span className="font-semibold">Ретро завершено</span>
            <span className={isLight ? "text-amber-900/90" : "text-amber-100/90"}>
              — доска только для просмотра.
            </span>
            {slug ? (
              <>
                <Link className="font-medium underline underline-offset-2" to={`/r/${slug}/summary`}>
                  Отчёт
                </Link>
                <span className={isLight ? "text-amber-900/60" : "text-amber-200/50"}>|</span>
                <Link className="font-medium underline underline-offset-2" to="/home">
                  На главную
                </Link>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <main
        ref={boardViewportRef}
        className={`relative z-0 min-h-0 flex-1 overflow-hidden overscroll-none px-6 py-4 ${
          pendingStickerPlacement || pendingBlockKind ? "cursor-crosshair" : ""
        }`}
        onMouseDown={beginPan}
        onMouseMove={(e) => {
          const boardPt = boardPointFromClient(boardViewportRef.current, e.clientX, e.clientY, boardOffset, boardScale);
          lastBoardPointerWorldRef.current = boardPt;
          if (pendingStickerPlacement) {
            setPendingStickerPos({ x: boardPt.x, y: boardPt.y });
          }
          if (pendingBlockKind) {
            setPendingBlockPos({ x: boardPt.x, y: boardPt.y });
          }
        }}
        onWheel={onBoardWheel}
        onClick={(e) => {
          if (suppressNextBoardClickRef.current) {
            suppressNextBoardClickRef.current = false;
            return;
          }
          if (pendingBlockKind) {
            const target = e.target as HTMLElement | null;
            if (
              target?.closest("[data-toolbar-action='true']") ||
              target?.closest("[data-board-block='true']") ||
              target?.closest("[data-sticker-card='true']") ||
              target?.closest("[data-context-menu='true']")
            ) {
              return;
            }
            const boardPt = boardPointFromClient(boardViewportRef.current, e.clientX, e.clientY, boardOffset, boardScale);
            void placeBlockAtBoardPoint(pendingBlockKind, boardPt.x, boardPt.y);
            setPendingBlockKind(null);
            setPendingBlockPos(null);
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (pendingStickerPlacement) {
            const target = e.target as HTMLElement | null;
            if (target?.closest("[data-toolbar-action='true']")) return;
            if (target?.closest("[data-sticker-card='true']")) return;
            if (target?.closest("[data-context-menu='true']")) return;

            const zone = target?.closest("[data-sticker-drop-zone='true']") as HTMLElement | null;
            if (zone && room) {
              const section = zone.closest("[data-board-block='true']") as HTMLElement | null;
              const blockId = section?.dataset.blockId;
              const blk = blockId ? room.blocks.find((b) => b.id === blockId) : undefined;
              if (blockId && blk && blk.kind !== FREE_CANVAS_BLOCK_KIND) {
                const sh = worldSizeFromCssPixels(DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT, boardScale);
                const { lx, ly } = stickerLocalPosInDropZone(zone, e.clientX, e.clientY, sh.width, sh.height);
                void addCard(blockId, "", {
                  initialLayout: {
                    x: lx,
                    y: ly,
                    width: sh.width,
                    height: sh.height,
                  },
                });
                setPendingStickerPlacement(false);
                setPendingStickerPos(null);
                e.preventDefault();
                e.stopPropagation();
                return;
              }
            }

            const boardPt = boardPointFromClient(boardViewportRef.current, e.clientX, e.clientY, boardOffset, boardScale);
            if (!slug || !room) {
              setPendingStickerPlacement(false);
              setPendingStickerPos(null);
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            let freeCanvas = room.blocks.find((b) => b.kind === FREE_CANVAS_BLOCK_KIND);
            if (freeCanvas) {
              placeStickerAtBoardPoint(freeCanvas.id, boardPt.x, boardPt.y);
              setPendingStickerPlacement(false);
              setPendingStickerPos(null);
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            void (async () => {
              try {
                if (!slug) return;
                try {
                  const created = await createBlock(slug, { kind: FREE_CANVAS_BLOCK_KIND, gridColumns: 1 });
                  setRoom((prev) => {
                    if (!prev) return prev;
                    if (prev.blocks.some((b) => b.id === created.block.id)) return prev;
                    return { ...prev, blocks: [...prev.blocks, created.block] };
                  });
                  placeStickerAtBoardPoint(created.block.id, boardPt.x, boardPt.y);
                } catch {
                  /* ignore */
                }
              } finally {
                setPendingStickerPlacement(false);
                setPendingStickerPos(null);
              }
            })();
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          const target = e.target as HTMLElement | null;
          if (target?.closest("[data-sticker-card='true']")) return;
          if (target?.closest("[data-sticker-format-toolbar='true']")) return;
          if (target?.closest("[data-plane-gadget='true']")) return;
          if (editingCardId) {
            editorRefs.current[editingCardId]?.blur();
            setEditingCardId(null);
          }
          setSelectedMemeId(null);
          setSelectedGadgetId(null);
          setSelectedCardId(null);
        }}
      >
        {editingCardId && formatToolbarPos && (
          <div
            data-sticker-format-toolbar="true"
            className={`fixed z-[999] flex max-w-[min(920px,calc(100vw-24px))] flex-wrap items-center gap-1 rounded border px-2 py-1.5 text-sm shadow-lg ${
              isLight ? "border-zinc-300 bg-white text-zinc-900" : "border-zinc-700 bg-zinc-900 text-zinc-100"
            }`}
            style={{ left: formatToolbarPos.x, top: formatToolbarPos.y }}
            onMouseDownCapture={(e) => e.preventDefault()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {(stickerSaveNotice ||
              (editingCardId &&
                editDrafts[editingCardId] &&
                editDrafts[editingCardId].length > STICKER_HTML_WARN_CHARS)) && (
              <div className="flex w-full basis-full flex-wrap gap-x-3 gap-y-1 text-[11px] leading-snug">
                {stickerSaveNotice && <span className="text-emerald-600">{stickerSaveNotice}</span>}
                {editingCardId &&
                  editDrafts[editingCardId] &&
                  editDrafts[editingCardId].length > STICKER_HTML_WARN_CHARS && (
                    <span className="text-amber-600">
                      Длинный текст (~{Math.round(editDrafts[editingCardId].length / 1000)}k символов HTML) — возможны тормоза; разбейте на несколько стикеров.
                    </span>
                  )}
              </div>
            )}
            <button type="button" className="border px-2 py-0.5 font-semibold" title="Жирный" onClick={() => formatSticker(editingCardId, "bold")}>
              B
            </button>
            <button type="button" className="border px-2 py-0.5 italic" title="Курсив" onClick={() => formatSticker(editingCardId, "italic")}>
              I
            </button>
            <button type="button" className="border px-2 py-0.5 underline" title="Подчёркнутый" onClick={() => formatSticker(editingCardId, "underline")}>
              U
            </button>
            <button type="button" className="border px-2 py-0.5 line-through" title="Зачёркнутый" onClick={() => formatSticker(editingCardId, "strikeThrough")}>
              S
            </button>
            <button type="button" className="border px-1.5 py-0.5 text-xs" title="Надстрочный" onClick={() => formatSticker(editingCardId, "superscript")}>
              xⁿ
            </button>
            <button type="button" className="border px-1.5 py-0.5 text-xs" title="Подстрочный" onClick={() => formatSticker(editingCardId, "subscript")}>
              xₙ
            </button>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-current opacity-25" aria-hidden />
            <button
              type="button"
              className="border px-1.5 py-0.5 text-xs"
              title="Отменить действие панели / вставку (набор текста — Ctrl+Z в поле)"
              onClick={() => stickerUndo(editingCardId)}
            >
              ↶
            </button>
            <button type="button" className="border px-1.5 py-0.5 text-xs" title="Повторить" onClick={() => stickerRedo(editingCardId)}>
              ↷
            </button>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-current opacity-25" aria-hidden />
            <button
              type="button"
              className={`border px-1.5 py-0.5 text-[10px] ${stickerLinkOpen ? "ring-1 ring-sky-500" : ""}`}
              title="Вставить или изменить ссылку"
              onClick={() => openStickerLinkPanel(editingCardId)}
            >
              URL
            </button>
            <button type="button" className="border px-1.5 py-0.5 text-xs" title="Убрать ссылку" onClick={() => unlinkStickerSelection(editingCardId)}>
              ×сс
            </button>
            {stickerLinkOpen ? (
              <div
                className="flex w-full basis-full flex-wrap items-center gap-1 border-t border-current/10 pt-1"
                data-sticker-format-toolbar="true"
                onMouseDownCapture={(e) => e.preventDefault()}
              >
                <input
                  ref={stickerLinkInputRef}
                  type="url"
                  className={`min-w-[12rem] flex-1 rounded border px-2 py-0.5 text-xs ${
                    isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-800"
                  }`}
                  value={stickerLinkHref}
                  placeholder="https://…"
                  onChange={(e) => setStickerLinkHref(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyStickerLink(editingCardId);
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setStickerLinkOpen(false);
                    }
                  }}
                />
                <button
                  type="button"
                  className="border px-2 py-0.5 text-xs"
                  onClick={() => applyStickerLink(editingCardId)}
                >
                  OK
                </button>
                <button type="button" className="border px-2 py-0.5 text-xs opacity-80" onClick={() => setStickerLinkOpen(false)}>
                  Отмена
                </button>
              </div>
            ) : null}
            <span className="mx-0.5 h-5 w-px shrink-0 bg-current opacity-25" aria-hidden />
            <button type="button" className="border px-1 py-0.5 text-[10px]" title="Копировать формат выделения" onClick={() => copyStickerFormat(editingCardId)}>
              кФ
            </button>
            <button type="button" className="border px-1 py-0.5 text-[10px]" title="Вставить скопированный формат" onClick={() => pasteStickerFormat(editingCardId)}>
              вФ
            </button>
            <button type="button" className="border px-1 py-0.5 text-[10px]" title="Очистить форматирование" onClick={() => clearStickerFormatting(editingCardId)}>
              оч
            </button>
            <button type="button" className="border px-1.5 py-0.5 text-xs" title="ВЕРХНИЙ РЕГИСТР" onClick={() => stickerSelectionCase(editingCardId, "upper")}>
              AA
            </button>
            <button type="button" className="border px-1.5 py-0.5 text-xs" title="нижний регистр" onClick={() => stickerSelectionCase(editingCardId, "lower")}>
              aa
            </button>
            <button type="button" className="border px-1.5 py-0.5 text-xs" title="Как предложение" onClick={() => stickerSelectionCase(editingCardId, "sentence")}>
              Aa
            </button>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-current opacity-25" aria-hidden />
            <button type="button" className="border px-1.5 py-0.5 text-xs" title="Цитата" onClick={() => stickerBlockquote(editingCardId)}>
              «»
            </button>
            <button type="button" className="border px-1.5 py-0.5 text-xs font-mono" title="Блок кода" onClick={() => insertStickerCodeBlock(editingCardId)}>
              {"{ }"}
            </button>
            <button type="button" className="border px-1.5 py-0.5 text-xs" title="Горизонтальная линия" onClick={() => insertStickerHorizontalRule(editingCardId)}>
              ─
            </button>
            <button
              type="button"
              className="border px-1.5 py-0.5 text-xs"
              title="Вставить текст из буфера без форматирования"
              onClick={() => void pastePlainFromClipboard(editingCardId)}
            >
              T
            </button>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-current opacity-25" aria-hidden />
            <label className="flex cursor-pointer items-center gap-0.5" title="Цвет текста">
              <span className="text-xs opacity-80">A</span>
              <input
                type="color"
                className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"
                value={toolbarForeColor}
                onInput={(e) => {
                  const v = (e.target as HTMLInputElement).value;
                  setToolbarForeColor(v);
                  formatSticker(editingCardId, "foreColor", v);
                }}
              />
            </label>
            <label className="flex cursor-pointer items-center gap-0.5" title="Цвет фона выделения">
              <span className="text-xs opacity-80">Hl</span>
              <input
                type="color"
                className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"
                value={toolbarHlColor}
                onInput={(e) => {
                  const v = (e.target as HTMLInputElement).value;
                  setToolbarHlColor(v);
                  stickerHighlightColor(editingCardId, v);
                }}
              />
            </label>
            <span
              className={`text-[10px] tabular-nums ${
                (stickerToolbarContrast != null && stickerToolbarContrast < 3) ||
                (stickerTextOnBgContrast != null && stickerTextOnBgContrast < 3)
                  ? "font-medium text-amber-600"
                  : "opacity-70"
              }`}
              title="Контраст: A↔Hl и A↔фон стикера (WCAG для крупного текста обычно ≥ 3∶1)"
            >
              {stickerToolbarContrast != null ? `Hl≈${stickerToolbarContrast.toFixed(1)}` : ""}
              {stickerTextOnBgContrast != null ? ` · фон≈${stickerTextOnBgContrast.toFixed(1)}` : ""}
            </span>
            <span className="relative">
              <button
                type="button"
                className="border px-1.5 py-0.5 text-base leading-none"
                title="Вставить эмодзи"
                data-toolbar-action="true"
                data-sticker-format-toolbar="true"
                onClick={() => setStickerEmojiOpen((o) => !o)}
              >
                😊
              </button>
              {stickerEmojiOpen ? (
                <div
                  className={`absolute left-0 top-full z-[1001] mt-1 flex max-w-[240px] flex-wrap gap-0.5 rounded border p-1 shadow-lg ${
                    isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-900"
                  }`}
                  data-sticker-format-toolbar="true"
                >
                  {stickerEmojiPalette.map((em) => (
                    <button
                      key={em}
                      type="button"
                      className="rounded px-1 py-0.5 text-lg hover:bg-black/10"
                      onClick={() => {
                        insertStickerEmojiChars(editingCardId, em);
                        setStickerEmojiOpen(false);
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              ) : null}
            </span>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-current opacity-25" aria-hidden />
            <select
              key={`font-${editingCardId}`}
              className={`max-w-[7.5rem] rounded border px-1 py-0.5 text-xs ${isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-800"}`}
              title="Шрифт"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (v && editingCardId) {
                  formatSticker(editingCardId, "fontName", v);
                }
                e.target.selectedIndex = 0;
              }}
            >
              <option value="" disabled>
                Шрифт
              </option>
              <option value="system-ui">Системный</option>
              <option value="Georgia, serif">С засечками</option>
              <option value="ui-monospace, monospace">Моно</option>
            </select>
            <select
              key={`size-${editingCardId}`}
              className={`max-w-[5.5rem] rounded border px-1 py-0.5 text-xs ${isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-800"}`}
              title="Размер выделенного текста"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (v && editingCardId) wrapStickerSelectionStyle(editingCardId, { fontSize: `${v}px` });
                e.target.selectedIndex = 0;
              }}
            >
              <option value="" disabled>
                Размер
              </option>
              {[10, 12, 14, 16, 18, 22, 28, 36].map((n) => (
                <option key={n} value={n}>
                  {n}px
                </option>
              ))}
            </select>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-current opacity-25" aria-hidden />
            <button type="button" className="border px-1.5 py-0.5 text-xs" title="Маркированный список" onClick={() => formatSticker(editingCardId, "insertUnorderedList")}>
              •
            </button>
            <button type="button" className="border px-1.5 py-0.5 text-xs" title="Нумерованный список" onClick={() => formatSticker(editingCardId, "insertOrderedList")}>
              1.
            </button>
            <button type="button" className="border px-1.5 py-0.5 text-xs" title="Увеличить отступ" onClick={() => formatSticker(editingCardId, "indent")}>
              →|
            </button>
            <button type="button" className="border px-1.5 py-0.5 text-xs" title="Уменьшить отступ" onClick={() => formatSticker(editingCardId, "outdent")}>
              |←
            </button>
            <button type="button" className="border px-1.5 py-0.5 text-xs" title="Таблица 2×2" onClick={() => insertStickerTable(editingCardId)}>
              ⊞
            </button>
            <button
              type="button"
              className="border px-1 py-0.5 text-[10px]"
              title="Строка ниже (курсор в ячейке таблицы)"
              onClick={() => stickerTableAddRowBelow(editingCardId)}
            >
              +стр
            </button>
            <button
              type="button"
              className="border px-1 py-0.5 text-[10px]"
              title="Столбец справа"
              onClick={() => stickerTableAddColumnRight(editingCardId)}
            >
              +стл
            </button>
            <button type="button" className="border px-1 py-0.5 text-[10px]" title="Удалить строку" onClick={() => stickerTableRemoveRow(editingCardId)}>
              −стр
            </button>
            <button type="button" className="border px-1 py-0.5 text-[10px]" title="Удалить столбец" onClick={() => stickerTableRemoveColumn(editingCardId)}>
              −стл
            </button>
            <button
              type="button"
              className="border px-1 py-0.5 text-[10px]"
              title="Объединить с ячейкой справа"
              onClick={() => stickerTableMergeRight(editingCardId)}
            >
              ⊞→
            </button>
            <button
              type="button"
              className="border px-1 py-0.5 text-[10px]"
              title="Объединить с ячейкой снизу"
              onClick={() => stickerTableMergeDown(editingCardId)}
            >
              ⊞↓
            </button>
            <button
              type="button"
              className="border px-1 py-0.5 text-[10px]"
              title="Разделить ячейку по горизонтали (colspan)"
              onClick={() => stickerTableSplitHorizontal(editingCardId)}
            >
              ⊟→
            </button>
            <button
              type="button"
              className="border px-1 py-0.5 text-[10px]"
              title="Разделить ячейку по вертикали (rowspan)"
              onClick={() => stickerTableSplitVertical(editingCardId)}
            >
              ⊟↓
            </button>
            <button type="button" className="border px-1 py-0.5 text-[10px]" title="Две колонки текста" onClick={() => insertStickerColumnsBlock(editingCardId, 2)}>
              ║2
            </button>
            <button type="button" className="border px-1 py-0.5 text-[10px]" title="Три колонки текста" onClick={() => insertStickerColumnsBlock(editingCardId, 3)}>
              ║3
            </button>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-current opacity-25" aria-hidden />
            <button
              type="button"
              className={`border px-1.5 py-0.5 text-xs ${stickerEditorBreakAll ? "ring-1 ring-sky-500" : ""}`}
              title="Жёсткий перенос длинных слов"
              onClick={() => setStickerEditorBreakAll((v) => !v)}
            >
              ↵
            </button>
            <button
              type="button"
              className={`border px-1.5 py-0.5 font-mono text-xs ${stickerEditorMono ? "ring-1 ring-sky-500" : ""}`}
              title="Моноширинный шрифт в редакторе (проще видеть пробелы и отступы)"
              onClick={() => setStickerEditorMono((v) => !v)}
            >
              ¶
            </button>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-current opacity-25" aria-hidden />
            <button
              type="button"
              className="border px-2 py-0.5"
              title="Выровнять по левому краю"
              onClick={() => {
                setCardTextAlign((p) => ({ ...p, [editingCardId]: "left" }));
                formatSticker(editingCardId, "justifyLeft");
              }}
            >
              L
            </button>
            <button
              type="button"
              className="border px-2 py-0.5"
              title="По центру"
              onClick={() => {
                setCardTextAlign((p) => ({ ...p, [editingCardId]: "center" }));
                formatSticker(editingCardId, "justifyCenter");
              }}
            >
              C
            </button>
            <button
              type="button"
              className="border px-2 py-0.5"
              title="По правому краю"
              onClick={() => {
                setCardTextAlign((p) => ({ ...p, [editingCardId]: "right" }));
                formatSticker(editingCardId, "justifyRight");
              }}
            >
              R
            </button>
            <button type="button" className="border px-2 py-0.5" title="Текст сверху" onClick={() => setCardVerticalAlign((p) => ({ ...p, [editingCardId]: "top" }))}>
              T
            </button>
            <button type="button" className="border px-2 py-0.5" title="Текст по центру по вертикали" onClick={() => setCardVerticalAlign((p) => ({ ...p, [editingCardId]: "middle" }))}>
              M
            </button>
            <button type="button" className="border px-2 py-0.5" title="Текст снизу" onClick={() => setCardVerticalAlign((p) => ({ ...p, [editingCardId]: "bottom" }))}>
              B
            </button>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-current opacity-25" aria-hidden />
            <select
              className={`max-w-[4.25rem] rounded border px-1 py-0.5 text-[10px] ${isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-800"}`}
              title="Межстрочный интервал в поле"
              value={String(stickerEditorLineHeight)}
              onChange={(e) => setStickerEditorLineHeight(Number(e.target.value))}
            >
              <option value="1">÷1</option>
              <option value="1.15">÷1.15</option>
              <option value="1.25">÷1.25</option>
              <option value="1.5">÷1.5</option>
              <option value="1.75">÷1.75</option>
            </select>
            <select
              className={`max-w-[3.75rem] rounded border px-1 py-0.5 text-[10px] ${isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-800"}`}
              title="Внутренние отступы поля (px)"
              value={String(stickerEditorPaddingPx)}
              onChange={(e) => setStickerEditorPaddingPx(Number(e.target.value))}
            >
              <option value="2">⊡2</option>
              <option value="4">⊡4</option>
              <option value="8">⊡8</option>
              <option value="12">⊡12</option>
            </select>
            <select
              className={`max-w-[3.25rem] rounded border px-1 py-0.5 text-[10px] ${isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-800"}`}
              title="Интервал между абзацами"
              value={String(stickerEditorParaGap)}
              onChange={(e) => setStickerEditorParaGap(Number(e.target.value) as 0 | 1 | 2)}
            >
              <option value="0">¶0</option>
              <option value="1">¶1</option>
              <option value="2">¶2</option>
            </select>
            <input
              type="text"
              className={`max-w-[7rem] rounded border px-1 py-0.5 text-[10px] ${isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-800"}`}
              title="Теги стикера (#идея #блокер)"
              placeholder="#теги"
              value={stickerTagsDraft}
              onChange={(e) => setStickerTagsDraft(e.target.value)}
              onBlur={() => applyStickerTagsForCard(editingCardId)}
            />
            <button
              type="button"
              className={`border px-1 py-0.5 text-[10px] ${connectionDraftFrom === editingCardId ? "ring-1 ring-violet-500" : ""}`}
              title="Связать с другим стикером (клик по второму)"
              onClick={() => startConnectionDraft(editingCardId)}
            >
              ↔
            </button>
            {mentionSuggest?.cardId === editingCardId && mentionCandidatesLive.length > 0 ? (
              <div
                className={`absolute left-0 top-full z-[1200] mt-1 max-h-40 min-w-[10rem] overflow-y-auto rounded border shadow-lg ${
                  isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-900"
                }`}
                data-sticker-format-toolbar="true"
              >
                {mentionCandidatesLive.map((mc, i) => (
                  <button
                    key={mc.userId}
                    type="button"
                    className={`block w-full px-2 py-1 text-left text-xs ${
                      i === mentionSuggest.pick
                        ? "bg-sky-500/25"
                        : isLight
                          ? "hover:bg-zinc-100"
                          : "hover:bg-zinc-800"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickMentionCandidate(mc)}
                  >
                    @{mc.label}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              className="border px-1 py-0.5 text-[10px]"
              title="Скопировать содержимое как Markdown"
              onClick={() => void copyStickerAsMarkdown(editingCardId)}
            >
              MD
            </button>
            <button
              type="button"
              className="border px-1 py-0.5 text-[10px]"
              title="Скачать карточку стикера как картинку: текст, реакции, имя автора, фон"
              onClick={() => void exportStickerAsPng(editingCardId)}
            >
              PNG
            </button>
          </div>
        )}
        {contextMenu && contextMenu.mode === "menu" && (
          <div
            data-context-menu="true"
            className={`fixed z-[1000] min-w-[180px] rounded border p-1 text-xs shadow-xl ${
              isLight ? "border-zinc-300 bg-white text-zinc-900" : "border-zinc-700 bg-zinc-900 text-zinc-100"
            }`}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button type="button" className="block w-full px-2 py-1 text-left hover:bg-sky-500/20" onClick={() => toggleLock(contextMenu.kind, contextMenu.id)}>
              {contextMenu.kind === "block"
                ? blockMeta[contextMenu.id]?.locked
                  ? "Разблокировать блок"
                  : "Заблокировать блок"
                : cardMeta[contextMenu.id]?.locked
                  ? "Разблокировать стикер"
                  : "Заблокировать стикер"}
            </button>
            <button
              type="button"
              className="block w-full px-2 py-1 text-left hover:bg-sky-500/20"
              onClick={() => setContextMenu({ ...contextMenu, mode: "pickBg" })}
            >
              Цвет фона…
            </button>
            {contextMenu.kind === "card" ? (
              <button
                type="button"
                className="block w-full px-2 py-1 text-left hover:bg-sky-500/20"
                onClick={() => {
                  startConnectionDraft(contextMenu.id);
                  setContextMenu(null);
                }}
              >
                Связать с другим стикером…
              </button>
            ) : null}
            <button type="button" className="block w-full px-2 py-1 text-left hover:bg-sky-500/20" onClick={() => bringToFront(contextMenu.kind, contextMenu.id)}>
              На передний план
            </button>
            <button type="button" className="block w-full px-2 py-1 text-left hover:bg-sky-500/20" onClick={() => sendToBack(contextMenu.kind, contextMenu.id)}>
              На задний план
            </button>
            <button type="button" className="block w-full px-2 py-1 text-left text-rose-500 hover:bg-rose-500/15" onClick={() => void deleteFromContextMenu()}>
              {contextMenu.kind === "block" ? "Удалить блок" : "Удалить стикер"}
            </button>
          </div>
        )}
        {contextMenu && contextMenu.mode === "pickBg" && (
          <div
            data-context-menu="true"
            className={`fixed z-[1000] min-w-[200px] max-w-[min(280px,calc(100vw-24px))] rounded border p-2 text-xs shadow-xl ${
              isLight ? "border-zinc-300 bg-white text-zinc-900" : "border-zinc-700 bg-zinc-900 text-zinc-100"
            }`}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="mb-2 font-semibold">Фон</div>
            <div className="mb-2 flex flex-wrap gap-1">
              {BG_PICKER_PRESETS.map((opt) =>
                opt.value === "" ? (
                  <button
                    key={opt.label}
                    type="button"
                    className={`rounded px-2 py-0.5 hover:bg-sky-500/20 ${isLight ? "bg-zinc-100" : "bg-zinc-800"}`}
                    onClick={() => applyContextBgColor("")}
                  >
                    {opt.label}
                  </button>
                ) : (
                  <button
                    key={opt.label}
                    type="button"
                    className="h-7 w-7 rounded border border-zinc-500/60"
                    style={{ backgroundColor: opt.value }}
                    title={opt.label}
                    aria-label={opt.label}
                    onClick={() => applyContextBgColor(opt.value)}
                  />
                ),
              )}
            </div>
            <label className="mb-2 flex cursor-pointer items-center gap-2">
              <span className="shrink-0">Свой</span>
              <input
                type="color"
                className="h-8 w-14 cursor-pointer rounded border bg-transparent"
                value={contextMenuHexOrDefault()}
                onChange={(e) => applyContextBgColor(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="w-full rounded px-2 py-1 text-left hover:bg-zinc-500/15"
              onClick={() => setContextMenu({ ...contextMenu, mode: "menu" })}
            >
              ← Назад
            </button>
          </div>
        )}
        <div
          ref={toolbarRef}
          className={`absolute left-4 z-[997] flex cursor-move flex-col gap-2 rounded-xl border p-3 shadow-xl ${
            isLight ? "border-zinc-300 bg-white/95 text-zinc-800" : "border-zinc-700 bg-zinc-900/95 text-zinc-100"
          } ${leftMenuPos ? "" : "top-1/2 -translate-y-1/2"}`}
          style={leftMenuPos ? { left: leftMenuPos.x, top: leftMenuPos.y } : undefined}
          onMouseDown={beginToolbarDrag}
        >
          <button
            type="button"
            data-toolbar-action="true"
            className={`flex h-11 w-11 items-center justify-center rounded ${
              isLight ? "bg-zinc-100 hover:bg-zinc-200" : "bg-zinc-800 hover:bg-zinc-700"
            }`}
            onClick={(e) => void addBlockFromToolbar(e)}
            title="Добавить блок"
            aria-label="Добавить блок"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </button>
          <button
            type="button"
            data-toolbar-action="true"
            className={`flex h-11 w-11 items-center justify-center rounded ${
              isLight ? "bg-zinc-100 hover:bg-zinc-200" : "bg-zinc-800 hover:bg-zinc-700"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              void addStickerFromToolbar(e);
            }}
            title="Добавить стикер"
            aria-label="Добавить стикер"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
              <path d="M5 3h14v14l-4 4H5V3zm12 14h-3v3l3-3z" />
            </svg>
          </button>
          <button
            type="button"
            data-toolbar-action="true"
            className={`flex h-11 w-11 items-center justify-center rounded ${
              isLight ? "bg-zinc-100 hover:bg-zinc-200" : "bg-zinc-800 hover:bg-zinc-700"
            }`}
            onClick={() => imageInputRef.current?.click()}
            title="Загрузить картинку"
            aria-label="Загрузить картинку"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 18V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12H4z" />
              <path d="m8 13 2.5-2.5L13 13l2-2 3 3" />
              <circle cx="9" cy="8" r="1" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button
            type="button"
            data-toolbar-action="true"
            className={`flex h-11 w-11 items-center justify-center rounded ${
              isLight ? "bg-zinc-100 hover:bg-zinc-200" : "bg-zinc-800 hover:bg-zinc-700"
            }`}
            onClick={() => addBoardTimerGadget()}
            title="Таймер на доске (синхронизируется через плоскость)"
            aria-label="Таймер на доске"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v6l4 2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            data-toolbar-action="true"
            className={`flex h-11 w-11 items-center justify-center rounded ${
              planeToolsOpen
                ? isLight
                  ? "bg-sky-200 ring-2 ring-sky-500"
                  : "bg-sky-900/70 ring-2 ring-sky-400"
                : isLight
                  ? "bg-zinc-100 hover:bg-zinc-200"
                  : "bg-zinc-800 hover:bg-zinc-700"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setPlaneToolsOpen((o) => !o);
            }}
            title="Шаблоны стикеров и схемы на плоскости"
            aria-label="Шаблоны стикеров и схемы"
          >
            <span className="text-lg font-semibold leading-none">≣</span>
          </button>
          {planeToolsOpen ? (
            <div
              data-toolbar-action="true"
              className={`max-h-[min(320px,calc(100vh-140px))] w-44 overflow-y-auto rounded-lg border px-2 py-2 text-[11px] leading-snug shadow-inner ${
                isLight ? "border-zinc-200 bg-zinc-50" : "border-zinc-700 bg-zinc-800/95"
              }`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className={`font-semibold ${isLight ? "text-zinc-700" : "text-zinc-200"}`}>Шаблоны</div>
              <div className="mt-1 space-y-0.5">
                {BOARD_STICKER_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="block w-full rounded px-2 py-1 text-left hover:bg-sky-500/20 disabled:opacity-40"
                    disabled={boardFrozen}
                    title={t.description ?? t.label}
                    onClick={(e) => void addStickerFromTemplateHtml(t.html, e)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className={`mt-3 font-semibold ${isLight ? "text-zinc-700" : "text-zinc-200"}`}>Схемы</div>
              <div className="mt-1 space-y-0.5">
                {BOARD_SCHEME_PRESETS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="block w-full rounded px-2 py-1 text-left hover:bg-emerald-500/20 disabled:opacity-40"
                    disabled={boardFrozen}
                    title={s.description ?? s.label}
                    onClick={() => addPresetSchemeFrames(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onSelectImageFile} />
        </div>
        <div
          className={`absolute bottom-4 left-4 z-[997] rounded-lg border px-3 py-2 text-sm shadow-xl ${
            isLight ? "border-zinc-300 bg-white/95 text-zinc-800" : "border-zinc-700 bg-zinc-900/95 text-zinc-100"
          }`}
        >
          <div className="font-semibold">Зум плоскости</div>
          <div>текущий: {Math.round(boardScale * 100)}%</div>
          <div className="mt-2 flex gap-1">
            <button
              type="button"
              className={`rounded px-2 py-1 ${
                isLight ? "bg-zinc-900 text-white disabled:bg-zinc-300" : "bg-zinc-200 text-zinc-900 disabled:bg-zinc-700"
              }`}
              onClick={undoViewAction}
              disabled={viewHistoryPast.length < 2}
              title="Отменить (Ctrl/Cmd+Z)"
            >
              Отменить
            </button>
            <button
              type="button"
              className={`rounded px-2 py-1 ${
                isLight ? "bg-zinc-900 text-white disabled:bg-zinc-300" : "bg-zinc-200 text-zinc-900 disabled:bg-zinc-700"
              }`}
              onClick={redoViewAction}
              disabled={viewHistoryFuture.length === 0}
              title="Повторить (Ctrl/Cmd+Y)"
            >
              Повторить
            </button>
          </div>
        </div>
        {!helpMinimized && !helpExpanded && (
          <div
            data-help-overlay="true"
            className={`absolute z-[998] flex w-[min(460px,calc(100vw-40px))] max-h-[min(520px,calc(100vh-120px))] flex-col overflow-hidden rounded-xl border shadow-xl ${
              isLight ? "border-zinc-300 bg-white/95 text-zinc-800" : "border-zinc-700 bg-zinc-900/95 text-zinc-100"
            }`}
            style={{ left: helpPos.x, top: helpPos.y }}
            onMouseDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <div
              className={`flex cursor-move select-none items-center justify-between rounded-t-xl px-3 py-2 text-sm ${
                isLight ? "bg-zinc-100 text-zinc-700" : "bg-zinc-800 text-zinc-200"
              }`}
              onMouseDown={beginHelpDrag}
            >
              <span className="font-semibold">Справка по управлению</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={`flex h-7 w-7 items-center justify-center rounded ${
                    isLight ? "bg-white text-zinc-700 hover:bg-zinc-200" : "bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
                  }`}
                  onClick={() => setHelpExpanded(true)}
                  title="На весь экран"
                  aria-label="Развернуть справку на весь экран"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`flex h-7 w-7 items-center justify-center rounded ${
                    isLight ? "bg-white text-zinc-700 hover:bg-zinc-200" : "bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
                  }`}
                  onClick={() => {
                    setHelpExpanded(false)
                    setHelpMinimized(true)
                  }}
                  title="Свернуть в кнопку"
                  aria-label="Закрыть справку"
                >
                  <span className="text-base leading-none">−</span>
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm leading-snug">{helpDocBody}</div>
          </div>
        )}
        <div
          className="relative origin-top-left"
          style={{ width: `${BOARD_WIDTH}px`, height: `${BOARD_HEIGHT}px`, transform: `translate(${boardOffset.x}px, ${boardOffset.y}px) scale(${boardScale})` }}
        >
        {room ? (
          <StickerConnectionsLayer
            room={room}
            connections={stickerConnections}
            blockLayouts={blockLayouts}
            cardLayouts={cardLayouts}
            draftFromCardId={connectionDraftFrom}
            draftHoverCardId={connectionHoverCardId}
            isLight={isLight}
          />
        ) : null}
        {pendingBlockKind && pendingBlockPos &&
          (() => {
            const base = getBaseBlockSize(pendingBlockKind);
            const sc = Math.max(1e-6, boardScale);
            const w = base.width / sc;
            const h = base.height / sc;
            return (
          <div
            className={`pointer-events-none absolute rounded-xl border-2 border-dashed ${
              isLight ? "border-violet-500 bg-violet-100/50" : "border-violet-400 bg-violet-500/15"
            }`}
            style={{
              left: pendingBlockPos.x - w / 2,
              top: pendingBlockPos.y - h / 2,
              width: w,
              height: h,
              zIndex: 9998,
            }}
          />
            );
          })()}
        {pendingStickerPlacement && pendingStickerPos &&
          (() => {
            const { width, height } = worldSizeFromCssPixels(DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT, boardScale);
            return (
          <div
            className={`pointer-events-none absolute rounded-lg border-2 border-dashed ${
              isLight ? "border-sky-500 bg-sky-100/60" : "border-sky-400 bg-sky-500/20"
            }`}
            style={{
              left: pendingStickerPos.x - width / 2,
              top: pendingStickerPos.y - height / 2,
              width,
              height,
              zIndex: 9999,
            }}
          />
            );
          })()}
        {planeShapesSorted.map((shape) => {
          if (shape.kind !== "frame") return null;
          const sel = selectedShapeId === shape.id;
          return (
            <div
              key={shape.id}
              data-plane-shape="true"
              className={`absolute box-border rounded-lg ${sel ? "ring-2 ring-sky-400" : ""}`}
              style={{
                left: shape.x,
                top: shape.y,
                width: shape.width,
                height: shape.height,
                borderWidth: 2,
                borderStyle: "solid",
                borderColor: shape.stroke ?? "#64748b",
                backgroundColor: shape.fill ?? "transparent",
                zIndex: shape.layerZ ?? 56,
                pointerEvents: boardFrozen ? "none" : "auto",
              }}
              onMouseDown={(e) => beginShapeDrag(e, shape)}
            >
              {shape.label ? (
                <span
                  className={`pointer-events-none absolute left-1 top-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-80 ${
                    isLight ? "text-zinc-800" : "text-zinc-100"
                  }`}
                >
                  {shape.label}
                </span>
              ) : null}
            </div>
          );
        })}
        {gadgets.map((g) => {
          if (g.kind !== "timer") return null;
          const sel = selectedGadgetId === g.id;
          const done = boardNowTs >= g.endsAtMs;
          return (
            <div
              key={g.id}
              data-plane-gadget="true"
              className={`absolute cursor-grab select-none rounded-lg border px-2 py-1.5 text-sm shadow-lg ${
                sel ? "border-sky-500 ring-2 ring-sky-400/50" : isLight ? "border-zinc-300 bg-white/95" : "border-zinc-600 bg-zinc-900/95"
              }`}
              style={{ left: g.x, top: g.y, zIndex: g.layerZ ?? 340 }}
              onMouseDown={(e) => beginGadgetDrag(e, g)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedGadgetId(g.id);
                setSelectedMemeId(null);
                setSelectedShapeId(null);
              }}
            >
              <div className={`text-[10px] font-semibold uppercase tracking-wide ${done ? "text-rose-500" : isLight ? "text-zinc-500" : "text-zinc-400"}`}>
                Таймер
              </div>
              <div className={`font-mono text-lg tabular-nums ${done ? "text-rose-600" : isLight ? "text-zinc-900" : "text-white"}`}>
                {formatGadgetCountdown(g.endsAtMs, boardNowTs)}
              </div>
              {sel && !boardFrozen ? (
                <button
                  type="button"
                  className="absolute -right-2 -top-2 rounded bg-rose-600 px-1 text-[11px] text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeGadget(g.id);
                  }}
                  title="Удалить таймер"
                >
                  ✕
                </button>
              ) : null}
            </div>
          );
        })}
        {blocksSorted.map((block) => {
          const copy = themePack.blocks[block.kind];
          if (!copy) return null;
          const baseSize = getBaseBlockSize(block.kind);
          const blockLayout = blockLayouts[block.id] ?? { x: 40, y: 40, width: baseSize.width, height: baseSize.height };
          const isDefaultStickerBlock = block.kind === "good" || block.kind === "bad" || block.kind === "improve";
          const blockScale = Math.min(blockLayout.width / baseSize.width, blockLayout.height / baseSize.height);
          const scaledContentWidth = baseSize.width * blockScale;
          const scaledContentHeight = baseSize.height * blockScale;
          const contentOffsetX = (blockLayout.width - scaledContentWidth) / 2;
          const contentOffsetY = (blockLayout.height - scaledContentHeight) / 2;
          const cards = sortCards(room.cards.filter((c) => c.blockId === block.id));
          const sprintStars = [...room.sprintStarEntries].sort((a, b) => b.starCount - a.starCount);
          const myVoteEntryId = room.sprintStarVotes.find((v) => v.voterKey === participantKey)?.entryId ?? null;
          const myRating = room.retroRatings.find((r) => r.voterKey === participantKey)?.score ?? null;
          const averageRating =
            room.retroRatings.length > 0
              ? (room.retroRatings.reduce((sum, r) => sum + r.score, 0) / room.retroRatings.length).toFixed(1)
              : null;
          return (
            <section
              key={block.id}
              data-board-block="true"
              data-block-id={block.id}
              className={`absolute overflow-visible rounded-2xl p-0 shadow-xl ${
                isLight ? "border border-zinc-300 bg-white" : "border border-white/10"
              }`}
              onContextMenu={(e) => openContextMenu(e, "block", block.id)}
              onMouseDown={(e) =>
                beginEntityDrag(
                  e,
                  { kind: "block", id: block.id, left: blockLayout.x, top: blockLayout.y, width: blockLayout.width, height: blockLayout.height },
                  "move",
                )
              }
              style={{
                left: blockLayout.x,
                top: blockLayout.y,
                width: blockLayout.width,
                height: blockLayout.height,
                zIndex: blockMeta[block.id]?.z ?? 100,
                ...(blockStyles[block.id]?.backgroundColor
                  ? { backgroundColor: blockStyles[block.id]!.backgroundColor! }
                  : isLight
                    ? {}
                    : { backgroundColor: `${palette.surface}ee` }),
              }}
            >
              <div
                className="origin-top-left"
                style={{
                  width: baseSize.width,
                  height: baseSize.height,
                  transform: `translate(${contentOffsetX}px, ${contentOffsetY}px) scale(${blockScale})`,
                }}
              >
                <div className="p-2">
              <div className="mb-2 select-none">
                <h2 className={`text-lg font-semibold ${isLight ? "text-zinc-900" : "text-white"}`}>{copy.title}</h2>
              </div>
              {copy.subtitle && <p className={`mt-0.5 text-sm ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>{copy.subtitle}</p>}

              {block.kind === "warmup" && copy.warmupOptions && (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {copy.warmupOptions.map((o) => (
                    <li key={o.id}>
                      {(() => {
                        const isMine = room.warmupVotes.some(
                          (w) => w.optionId === o.id && w.voterKey === participantKey,
                        );
                        return (
                          <div
                            className={`flex min-h-[108px] flex-col rounded-lg px-3 py-2 text-sm transition-colors ${
                              isMine
                                ? isLight
                                  ? "border border-sky-500 bg-sky-50 text-zinc-800"
                                  : "border border-sky-400/70 bg-sky-500/15 text-zinc-100"
                                : isLight
                                  ? "border border-zinc-300 bg-zinc-50 text-zinc-700"
                                  : "border border-white/10 bg-black/20 text-zinc-200"
                            }`}
                          >
                      <button
                        type="button"
                        className="w-full flex-1 text-left"
                        onClick={() => void setWarmupOption(o.id)}
                      >
                        <span className={`font-medium ${isLight ? "text-zinc-900" : "text-white"}`}>{o.label}</span>
                        {o.hint && <span className={`block ${isLight ? "text-zinc-500" : "text-zinc-500"}`}>{o.hint}</span>}
                      </button>
                      <div className="mt-2 flex h-6 items-center gap-1.5 overflow-x-auto overflow-y-hidden pr-1">
                        {room.warmupVotes
                          .filter((w) => w.optionId === o.id)
                          .map((w) => (
                            <img
                              key={w.id}
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(w.voterName)}&background=334155&color=ffffff&size=64`}
                              alt={w.voterName}
                              title={w.voterName}
                              className={`h-6 w-6 rounded-full object-cover ${
                                isLight ? "border border-zinc-300" : "border border-white/20"
                              }`}
                            />
                          ))}
                      </div>
                          </div>
                        );
                      })()}
                    </li>
                  ))}
                </ul>
              )}

              {block.kind === "sprintStar" && (
                <div className="mt-4 flex flex-col gap-3">
                  {sprintStars.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-lg p-3 text-sm ${
                        isLight ? "border border-zinc-300 bg-zinc-50" : "border border-white/10 bg-black/20"
                      }`}
                    >
                      {(() => {
                        const myVoted = myVoteEntryId === entry.id;
                        const profile = describeSprintStarActivity(room, entry);
                        const photoSrc =
                          entry.photoUrl ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}&background=334155&color=ffffff`;
                        const starView = sprintStarVisual(entry.starCount);
                        return (
                          <>
                      <div className="flex min-h-[140px] items-stretch justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-stretch gap-3">
                          <img
                            src={photoSrc}
                            alt={entry.name}
                            className={`h-full aspect-square rounded-md object-cover ${
                              isLight ? "border border-zinc-300" : "border border-white/10"
                            }`}
                          />
                          <div className="min-w-0 py-1">
                            <p className={`font-medium ${isLight ? "text-zinc-900" : "text-white"}`}>{entry.name}</p>
                            <p className={`mt-1 text-xs ${isLight ? "text-zinc-600" : "text-zinc-300"}`}>{profile}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="group relative border-none bg-transparent p-0 leading-none"
                          onClick={() => void toggleSprintStar(entry.id)}
                          title={myVoted ? "Убрать мою звезду" : "Поставить мою звезду"}
                        >
                          <span
                            style={{
                              fontSize: `${starView.sizePx}px`,
                              color: myVoted ? "#facc15" : starView.color,
                            }}
                          >
                            {myVoted ? "★" : starView.symbol}
                          </span>
                          <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-black/80 px-2 py-0.5 text-[11px] text-white group-hover:block">
                            {entry.starCount}
                          </span>
                        </button>
                      </div>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}

              {block.kind === "rateRetro" && (
                <div
                  className={`mt-4 rounded-lg p-3 ${
                    isLight ? "border border-zinc-300 bg-zinc-50" : "border border-white/10 bg-black/20"
                  }`}
                >
                  <p className={`text-sm ${isLight ? "text-zinc-700" : "text-zinc-300"}`}>Выберите оценку от 1 до 5:</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={`${block.id}-score-${score}`}
                        type="button"
                        className={`rounded-lg px-3 py-2 text-sm ${
                          myRating === score
                            ? "bg-emerald-700 text-white"
                            : isLight
                              ? "bg-white text-zinc-700 border border-zinc-300"
                              : "bg-zinc-800 text-zinc-200"
                        }`}
                        onClick={() => void setRetroScore(score)}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <p className={`mt-3 text-xs ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
                    {averageRating ? `Средняя оценка: ${averageRating} (${room.retroRatings.length} голосов)` : "Пока нет оценок"}
                  </p>
                </div>
              )}

              {block.kind !== "warmup" && (
                <div
                  data-sticker-drop-zone="true"
                  className={`relative mt-2 ${isDefaultStickerBlock ? "h-[420px]" : "h-[220px]"}`}
                >
                  {cards.map((c) => {
                  const cardLayout = cardLayouts[c.id] ?? { x: 12, y: 12, width: DEFAULT_CARD_WIDTH, height: DEFAULT_CARD_HEIGHT };
                  const scaleForText = Math.min(
                    cardLayout.width / DEFAULT_CARD_WIDTH,
                    cardLayout.height / DEFAULT_CARD_HEIGHT,
                  );
                  const textFontPx = Math.max(11, Math.round(13 * scaleForText));
                  const authorFontPx = Math.max(8, Math.round(10 * scaleForText));
                  const textAlign = cardTextAlign[c.id] ?? "left";
                  const vAlign = cardVerticalAlign[c.id] ?? "top";
                  const justifyClass =
                    vAlign === "middle" ? "justify-center" : vAlign === "bottom" ? "justify-end" : "justify-start";
                  return (
                  <div
                    key={c.id}
                    data-sticker-card="true"
                    className={`absolute flex flex-col overflow-hidden rounded-lg p-1 text-sm ${
                      selectedCardId === c.id
                        ? isLight
                          ? "border border-sky-500 bg-white text-zinc-800 shadow-[0_0_0_1px_rgba(14,165,233,0.35)]"
                          : "border border-sky-400/70 bg-amber-200/10 text-zinc-100 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
                        : isLight
                          ? "border border-zinc-300 bg-white text-zinc-800"
                          : "border border-amber-900/40 bg-amber-200/10 text-zinc-100"
                    } ${!cardMatchesMineFilter(c) ? "opacity-20 pointer-events-none" : ""} ${
                      connectionDraftFrom === c.id ? "ring-2 ring-violet-500" : connectionHoverCardId === c.id ? "ring-2 ring-violet-400/80" : ""
                    }`}
                    style={{
                      left: cardLayout.x,
                      top: cardLayout.y,
                      width: cardLayout.width,
                      height: cardLayout.height,
                      zIndex: cardMeta[c.id]?.z ?? 200,
                      cursor: connectionDraftFrom ? "crosshair" : cardMeta[c.id]?.locked ? "default" : "move",
                      ...(cardStyles[c.id]?.backgroundColor
                        ? { backgroundColor: cardStyles[c.id]!.backgroundColor! }
                        : {}),
                    }}
                    onContextMenu={(e) => openContextMenu(e, "card", c.id)}
                    onMouseEnter={() => {
                      if (connectionDraftFrom) setConnectionHoverCardId(c.id);
                    }}
                    onMouseLeave={() => {
                      if (connectionDraftFrom) setConnectionHoverCardId((id) => (id === c.id ? null : id));
                    }}
                    onClick={(e) => {
                      if (connectionDraftFrom) {
                        e.stopPropagation();
                        completeStickerConnection(c.id);
                      }
                    }}
                    onMouseDown={(e) => {
                      if (connectionDraftFrom) {
                        e.stopPropagation();
                        return;
                      }
                      beginEntityDrag(
                        e,
                        {
                          kind: "card",
                          id: c.id,
                          blockId: block.id,
                          left: cardLayout.x,
                          top: cardLayout.y,
                          width: cardLayout.width,
                          height: cardLayout.height,
                        },
                        "move",
                        "se",
                        true,
                      );
                    }}
                  >
                    {editingCardId === c.id ? (
                      <div className="min-h-0 flex-1">
                        <div className={`flex h-full min-h-0 ${justifyClass}`}>
                          {!stickerEditReady ? (
                            <div
                              className="h-full min-h-[2rem] w-full animate-pulse rounded bg-black/5 dark:bg-white/5"
                              aria-hidden
                            />
                          ) : (
                          <StickerTipTapFieldLazy
                            key={`sticker-edit-${c.id}`}
                            cardId={c.id}
                            initialContent={stickerCardEditorContent(c, editDrafts[c.id])}
                            collab={
                              stickerEditCollab && stickerCollabProvider
                                ? {
                                    provider: stickerCollabProvider,
                                    user: stickerCollabUser,
                                    seedContent: stickerCardEditorContent(c, editDrafts[c.id]),
                                  }
                                : undefined
                            }
                            className={`sticker-editor-scroll h-full w-full overflow-auto whitespace-pre-wrap ${
                              stickerEditorBreakAll ? "break-all" : "break-words"
                            } ${stickerEditorMono ? "font-mono" : ""} ${
                              stickerEditorParaGap === 1 ? "[&_p+p]:mt-2" : stickerEditorParaGap === 2 ? "[&_p+p]:mt-4" : ""
                            } ${isLight ? "bg-transparent text-zinc-900" : "bg-transparent text-white"}`}
                            style={{
                              fontSize: `${textFontPx}px`,
                              lineHeight: stickerEditorLineHeight,
                              textAlign,
                              caretColor: "#0ea5e9",
                              padding: stickerEditorPaddingPx,
                            }}
                            onHtmlChange={handleStickerHtmlChange}
                            onRegister={registerStickerEditor}
                            onPaste={handleStickerPaste}
                            onBlur={(_cardId, e) => {
                              if (shouldSkipStickerSaveForFormatToolbar(e)) return;
                              void saveCardText(c);
                            }}
                            onLinkClick={stickerEditorLinkClick}
                            onKeyDown={handleStickerEditorKeyDown}
                          />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={`flex min-h-0 flex-1 overflow-hidden ${justifyClass}`}>
                        <div
                          className="sticker-html w-full whitespace-pre-wrap break-words"
                          style={{ fontSize: `${textFontPx}px`, lineHeight: 1.25, textAlign }}
                          dangerouslySetInnerHTML={{ __html: c.text || "" }}
                        />
                      </div>
                    )}
                    {cardTags[c.id]?.length ? (
                      <div className="flex flex-wrap gap-0.5 px-0.5">
                        {cardTags[c.id]!.map((tag) => (
                          <span
                            key={tag}
                            className={`rounded px-1 py-px text-[9px] font-medium ${
                              isLight ? "bg-violet-100 text-violet-800" : "bg-violet-900/50 text-violet-200"
                            }`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <StickerReactionsBar cardId={c.id} />
                    <p
                      className={`truncate ${isLight ? "text-zinc-500" : "text-zinc-500"}`}
                      style={{ fontSize: `${authorFontPx}px`, lineHeight: 1.1 }}
                      title={c.authorDisplayName ?? "Аноним"}
                    >
                      {c.authorDisplayName ?? "Аноним"}
                    </p>
                    <div
                      className="absolute -left-1 -top-1 h-3 w-3 cursor-nwse-resize"
                      onMouseDown={(e) =>
                        beginEntityDrag(
                          e,
                          {
                            kind: "card",
                            id: c.id,
                            blockId: block.id,
                            left: cardLayout.x,
                            top: cardLayout.y,
                            width: cardLayout.width,
                            height: cardLayout.height,
                          },
                          "resize",
                          "nw",
                        )
                      }
                    />
                    <div
                      className="absolute -right-1 -top-1 h-3 w-3 cursor-nesw-resize"
                      onMouseDown={(e) =>
                        beginEntityDrag(
                          e,
                          {
                            kind: "card",
                            id: c.id,
                            blockId: block.id,
                            left: cardLayout.x,
                            top: cardLayout.y,
                            width: cardLayout.width,
                            height: cardLayout.height,
                          },
                          "resize",
                          "ne",
                        )
                      }
                    />
                    <div
                      className="absolute -left-1 -bottom-1 h-3 w-3 cursor-nesw-resize"
                      onMouseDown={(e) =>
                        beginEntityDrag(
                          e,
                          {
                            kind: "card",
                            id: c.id,
                            blockId: block.id,
                            left: cardLayout.x,
                            top: cardLayout.y,
                            width: cardLayout.width,
                            height: cardLayout.height,
                          },
                          "resize",
                          "sw",
                        )
                      }
                    />
                    <div
                      className="absolute -right-1 -bottom-1 h-3 w-3 cursor-nwse-resize"
                      onMouseDown={(e) =>
                        beginEntityDrag(
                          e,
                          {
                            kind: "card",
                            id: c.id,
                            blockId: block.id,
                            left: cardLayout.x,
                            top: cardLayout.y,
                            width: cardLayout.width,
                            height: cardLayout.height,
                          },
                          "resize",
                          "se",
                        )
                      }
                    />
                  </div>
                  );
                  })}
                </div>
              )}
                </div>
              </div>
              <div
                className="absolute -left-1 -top-1 h-4 w-4 cursor-nwse-resize"
                onMouseDown={(e) =>
                  beginEntityDrag(
                    e,
                    { kind: "block", id: block.id, left: blockLayout.x, top: blockLayout.y, width: blockLayout.width, height: blockLayout.height },
                    "resize",
                    "nw",
                  )
                }
              />
              <div
                className="absolute -right-1 -top-1 h-4 w-4 cursor-nesw-resize"
                onMouseDown={(e) =>
                  beginEntityDrag(
                    e,
                    { kind: "block", id: block.id, left: blockLayout.x, top: blockLayout.y, width: blockLayout.width, height: blockLayout.height },
                    "resize",
                    "ne",
                  )
                }
              />
              <div
                className="absolute -left-1 -bottom-1 h-4 w-4 cursor-nesw-resize"
                onMouseDown={(e) =>
                  beginEntityDrag(
                    e,
                    { kind: "block", id: block.id, left: blockLayout.x, top: blockLayout.y, width: blockLayout.width, height: blockLayout.height },
                    "resize",
                    "sw",
                  )
                }
              />
              <div
                className="absolute -right-1 -bottom-1 h-4 w-4 cursor-nwse-resize"
                onMouseDown={(e) =>
                  beginEntityDrag(
                    e,
                    { kind: "block", id: block.id, left: blockLayout.x, top: blockLayout.y, width: blockLayout.width, height: blockLayout.height },
                    "resize",
                    "se",
                  )
                }
              />
            </section>
          );
        })}
        {sortCards(room.cards.filter((c) => freeCanvasBlockIds.has(c.blockId))).map((c) => {
          const cardLayout = cardLayouts[c.id] ?? { x: 12, y: 12, width: DEFAULT_CARD_WIDTH, height: DEFAULT_CARD_HEIGHT };
          const scaleForText = Math.min(
            cardLayout.width / DEFAULT_CARD_WIDTH,
            cardLayout.height / DEFAULT_CARD_HEIGHT,
          );
          const textFontPx = Math.max(11, Math.round(13 * scaleForText));
          const authorFontPx = Math.max(8, Math.round(10 * scaleForText));
          const textAlign = cardTextAlign[c.id] ?? "left";
          const vAlign = cardVerticalAlign[c.id] ?? "top";
          const justifyClass =
            vAlign === "middle" ? "justify-center" : vAlign === "bottom" ? "justify-end" : "justify-start";
          return (
            <div
              key={c.id}
              data-sticker-card="true"
              className={`absolute flex flex-col overflow-hidden rounded-lg p-1 text-sm ${
                selectedCardId === c.id
                  ? isLight
                    ? "border border-sky-500 bg-white text-zinc-800 shadow-[0_0_0_1px_rgba(14,165,233,0.35)]"
                    : "border border-sky-400/70 bg-amber-200/10 text-zinc-100 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
                  : isLight
                    ? "border border-zinc-300 bg-white text-zinc-800"
                    : "border border-amber-900/40 bg-amber-200/10 text-zinc-100"
              } ${!cardMatchesMineFilter(c) ? "opacity-20 pointer-events-none" : ""} ${
                connectionDraftFrom === c.id ? "ring-2 ring-violet-500" : connectionHoverCardId === c.id ? "ring-2 ring-violet-400/80" : ""
              }`}
              style={{
                left: cardLayout.x,
                top: cardLayout.y,
                width: cardLayout.width,
                height: cardLayout.height,
                zIndex: cardMeta[c.id]?.z ?? 200,
                cursor: connectionDraftFrom ? "crosshair" : cardMeta[c.id]?.locked ? "default" : "move",
                ...(cardStyles[c.id]?.backgroundColor
                  ? { backgroundColor: cardStyles[c.id]!.backgroundColor! }
                  : {}),
              }}
              onContextMenu={(e) => openContextMenu(e, "card", c.id)}
              onMouseEnter={() => {
                if (connectionDraftFrom) setConnectionHoverCardId(c.id);
              }}
              onMouseLeave={() => {
                if (connectionDraftFrom) setConnectionHoverCardId((id) => (id === c.id ? null : id));
              }}
              onClick={(e) => {
                if (connectionDraftFrom) {
                  e.stopPropagation();
                  completeStickerConnection(c.id);
                }
              }}
              onMouseDown={(e) => {
                if (connectionDraftFrom) {
                  e.stopPropagation();
                  return;
                }
                beginEntityDrag(
                  e,
                  {
                    kind: "card",
                    id: c.id,
                    left: cardLayout.x,
                    top: cardLayout.y,
                    width: cardLayout.width,
                    height: cardLayout.height,
                  },
                  "move",
                  "se",
                  true,
                );
              }}
            >
              {editingCardId === c.id ? (
                <div className="min-h-0 flex-1">
                  <div className={`flex h-full min-h-0 ${justifyClass}`}>
                    {!stickerEditReady ? (
                      <div
                        className="h-full min-h-[2rem] w-full animate-pulse rounded bg-black/5 dark:bg-white/5"
                        aria-hidden
                      />
                    ) : (
                    <StickerTipTapFieldLazy
                      key={`sticker-edit-${c.id}`}
                      cardId={c.id}
                      initialContent={stickerCardEditorContent(c, editDrafts[c.id])}
                      collab={
                        stickerEditCollab && stickerCollabProvider
                          ? {
                              provider: stickerCollabProvider,
                              user: stickerCollabUser,
                              seedContent: stickerCardEditorContent(c, editDrafts[c.id]),
                            }
                          : undefined
                      }
                      className={`sticker-editor-scroll h-full w-full overflow-auto whitespace-pre-wrap ${
                        stickerEditorBreakAll ? "break-all" : "break-words"
                      } ${stickerEditorMono ? "font-mono" : ""} ${
                        stickerEditorParaGap === 1 ? "[&_p+p]:mt-2" : stickerEditorParaGap === 2 ? "[&_p+p]:mt-4" : ""
                      } ${isLight ? "bg-transparent text-zinc-900" : "bg-transparent text-white"}`}
                      style={{
                        fontSize: `${textFontPx}px`,
                        lineHeight: stickerEditorLineHeight,
                        textAlign,
                        caretColor: "#0ea5e9",
                        padding: stickerEditorPaddingPx,
                      }}
                      onHtmlChange={handleStickerHtmlChange}
                      onRegister={registerStickerEditor}
                      onPaste={handleStickerPaste}
                      onBlur={(_cardId, e) => {
                        if (shouldSkipStickerSaveForFormatToolbar(e)) return;
                        void saveCardText(c);
                      }}
                      onLinkClick={stickerEditorLinkClick}
                      onKeyDown={handleStickerEditorKeyDown}
                    />
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`sticker-html min-h-0 flex-1 overflow-hidden whitespace-pre-wrap break-words px-1 py-0.5 ${
                    isLight ? "text-zinc-900" : "text-white"
                  } ${justifyClass}`}
                  style={{ fontSize: `${textFontPx}px`, lineHeight: 1.25, textAlign }}
                  dangerouslySetInnerHTML={{ __html: c.text || "" }}
                />
              )}
              {cardTags[c.id]?.length ? (
                <div className="flex flex-wrap gap-0.5 px-0.5">
                  {cardTags[c.id]!.map((tag) => (
                    <span
                      key={tag}
                      className={`rounded px-1 py-px text-[9px] font-medium ${
                        isLight ? "bg-violet-100 text-violet-800" : "bg-violet-900/50 text-violet-200"
                      }`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <StickerReactionsBar cardId={c.id} />
              <p
                className={`truncate ${isLight ? "text-zinc-500" : "text-zinc-500"}`}
                style={{ fontSize: `${authorFontPx}px`, lineHeight: 1.1 }}
                title={c.authorDisplayName ?? "Аноним"}
              >
                {c.authorDisplayName ?? "Аноним"}
              </p>
              <div
                className="absolute -left-1 -top-1 h-3 w-3 cursor-nwse-resize"
                onMouseDown={(e) =>
                  beginEntityDrag(
                    e,
                    {
                      kind: "card",
                      id: c.id,
                      left: cardLayout.x,
                      top: cardLayout.y,
                      width: cardLayout.width,
                      height: cardLayout.height,
                    },
                    "resize",
                    "nw",
                  )
                }
              />
              <div
                className="absolute -right-1 -top-1 h-3 w-3 cursor-nesw-resize"
                onMouseDown={(e) =>
                  beginEntityDrag(
                    e,
                    {
                      kind: "card",
                      id: c.id,
                      left: cardLayout.x,
                      top: cardLayout.y,
                      width: cardLayout.width,
                      height: cardLayout.height,
                    },
                    "resize",
                    "ne",
                  )
                }
              />
              <div
                className="absolute -left-1 -bottom-1 h-3 w-3 cursor-nesw-resize"
                onMouseDown={(e) =>
                  beginEntityDrag(
                    e,
                    {
                      kind: "card",
                      id: c.id,
                      left: cardLayout.x,
                      top: cardLayout.y,
                      width: cardLayout.width,
                      height: cardLayout.height,
                    },
                    "resize",
                    "sw",
                  )
                }
              />
              <div
                className="absolute -right-1 -bottom-1 h-3 w-3 cursor-nwse-resize"
                onMouseDown={(e) =>
                  beginEntityDrag(
                    e,
                    {
                      kind: "card",
                      id: c.id,
                      left: cardLayout.x,
                      top: cardLayout.y,
                      width: cardLayout.width,
                      height: cardLayout.height,
                    },
                    "resize",
                    "se",
                  )
                }
              />
            </div>
          );
        })}
        </div>
      </main>
      <RetrogenDockableAbout open={aboutOpen} onClose={() => setAboutOpen(false)} isLight={isLight} />
      {!helpMinimized && helpExpanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="retrogen-help-title"
          data-help-overlay="true"
          className={`fixed inset-0 z-[1000] flex min-h-0 flex-col ${isLight ? "bg-white text-zinc-800" : "bg-zinc-900 text-zinc-100"}`}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className={`flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 sm:px-6 ${
              isLight ? "border-zinc-200 bg-zinc-50" : "border-zinc-600 bg-zinc-800/90"
            }`}
          >
            <span id="retrogen-help-title" className="text-lg font-semibold">
              Справка по управлению
            </span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  isLight ? "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100" : "border border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                }`}
                onClick={() => setHelpExpanded(false)}
                title="Вернуться к маленькому окну"
                aria-label="Свернуть на маленькое окно"
              >
                Окно
              </button>
              <button
                type="button"
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  isLight ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-200 text-zinc-900 hover:bg-white"
                }`}
                onClick={() => {
                  setHelpExpanded(false)
                  setHelpMinimized(true)
                }}
                title="Свернуть в кнопку в шапке"
                aria-label="Закрыть справку"
              >
                Закрыть
              </button>
            </div>
          </div>
          <div className="mx-auto min-h-0 w-full max-w-3xl flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm leading-snug sm:px-8 sm:py-6">
            {helpDocBody}
          </div>
        </div>
      )}
    </div>
  );
}
