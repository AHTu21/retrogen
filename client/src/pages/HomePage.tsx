import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createAppSocket } from "../lib/socketClient";
import { createRoom, fetchAuthMe, fetchRoomsLobby, logoutAccount, type AuthUserDto } from "../api";
import type { LobbyRoomDto } from "../types";
import {
  getFavoriteSlugs,
  getVisitedRooms,
  toggleFavoriteSlug,
  type VisitedRoomEntry,
} from "../lib/roomLobbyPrefs";
import { RetrogenDockableAbout } from "../components/RetrogenDockableAbout";
import { RetrogenDockableHelpRoot, RetrogenDockableHelpToggle } from "../components/RetrogenDockableHelp";
import { RetrogenOverflowMenu } from "../components/RetrogenOverflowMenu";
import { MessengerNavIconButton } from "../components/MessengerNavIconButton";
import { ThemeCornersIconButtons } from "../components/ThemeCornersIconButtons";
import { useAppCorners, useAppTheme } from "../theme";

type StatusFilter = "all" | "live" | "ended";
type HomeMainTab = "history" | "favorites" | "search";
type RoomCreateKind = "retro" | "empty";

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type HomeRoomTableRow = {
  slug: string;
  themeSanitized: string;
  status: string;
  stickerCount: number | null;
  dateIso: string;
};

type SortKey = "theme" | "status" | "stickers" | "date" | "slug";
type ExcelCol = "fav" | "theme" | "status" | "stickers" | "date" | "slug";

function formatCellDate(iso: string) {
  if (!iso) return "—";
  return formatShortDate(iso);
}

function parseRowDate(iso: string): number {
  if (!iso) return NaN;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? NaN : t;
}

function statusRank(s: string): number {
  if (s === "live") return 0;
  if (s === "ended") return 1;
  return 2;
}

function compareRows(a: HomeRoomTableRow, b: HomeRoomTableRow, key: SortKey, dir: "asc" | "desc"): number {
  let cmp = 0;
  switch (key) {
    case "theme":
      cmp = a.themeSanitized.localeCompare(b.themeSanitized, undefined, { sensitivity: "base" });
      break;
    case "status": {
      cmp = statusRank(a.status) - statusRank(b.status);
      if (cmp === 0) cmp = a.status.localeCompare(b.status);
      break;
    }
    case "stickers": {
      const av = a.stickerCount ?? -1;
      const bv = b.stickerCount ?? -1;
      cmp = av - bv;
      break;
    }
    case "date": {
      const av = parseRowDate(a.dateIso);
      const bv = parseRowDate(b.dateIso);
      cmp = (Number.isNaN(av) ? -Infinity : av) - (Number.isNaN(bv) ? -Infinity : bv);
      break;
    }
    case "slug":
      cmp = a.slug.localeCompare(b.slug);
      break;
  }
  return dir === "asc" ? cmp : -cmp;
}

function dayKey(iso: string): string {
  if (!iso) return "__none__";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "__bad__";
  return new Date(t).toISOString().slice(0, 10);
}

function formatDayLabel(ymd: string): string {
  if (ymd === "__none__") return "—";
  if (ymd === "__bad__") return "?";
  try {
    return new Date(ymd + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return ymd;
  }
}

function stickerTok(n: number | null): string {
  return n == null ? "__null__" : String(n);
}

function stickerTokLabel(t: string): string {
  return t === "__null__" ? "— (нет данных)" : t;
}

function FilterFunnelIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 shrink-0 ${active ? "text-sky-600 dark:text-sky-400" : "opacity-45"}`}
      fill="currentColor"
      aria-hidden
    >
      <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
    </svg>
  );
}

function StatusCell({ status, isLight }: { status: string; isLight: boolean }) {
  if (status === "ended") {
    return (
      <span className={`rounded px-2 py-0.5 text-xs ${isLight ? "bg-zinc-200 text-zinc-800" : "bg-zinc-700 text-zinc-100"}`}>завершено</span>
    );
  }
  if (status === "live") {
    return (
      <span className={`rounded px-2 py-0.5 text-xs ${isLight ? "bg-emerald-100 text-emerald-900" : "bg-emerald-900/40 text-emerald-100"}`}>идёт</span>
    );
  }
  return <span className="text-xs opacity-80">{status || "—"}</span>;
}

function statusTextRu(v: string): string {
  if (v === "live") return "идёт";
  if (v === "ended") return "завершено";
  return v || "—";
}

const LOBBY_COL_WIDTHS_KEY = "retrogen_lobby_col_widths_v1";
const LOBBY_COL_DEFAULTS = [72, 220, 120, 96, 140, 160];
const LOBBY_COL_MINS = [64, 120, 88, 72, 100, 100];

function readLobbyColWidths(): number[] {
  try {
    const raw = localStorage.getItem(LOBBY_COL_WIDTHS_KEY);
    if (!raw) return [...LOBBY_COL_DEFAULTS];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr) || arr.length !== 6) return [...LOBBY_COL_DEFAULTS];
    const n = arr.map((x) => (typeof x === "number" && Number.isFinite(x) ? x : 0));
    return n.map((w, i) => Math.max(LOBBY_COL_MINS[i]!, w || LOBBY_COL_DEFAULTS[i]!));
  } catch {
    return [...LOBBY_COL_DEFAULTS];
  }
}

function HomeRoomsTable({
  rows,
  isLight,
  isRounded,
  onFavChange,
  emptyMessage,
  loading,
  tab,
  favRevision,
  serverSearch,
  serverStatus,
  lobbyError,
}: {
  rows: HomeRoomTableRow[];
  isLight: boolean;
  isRounded: boolean;
  onFavChange: () => void;
  emptyMessage: string;
  loading?: boolean;
  tab: HomeMainTab;
  favRevision: number;
  serverSearch?: { value: string; onChange: (v: string) => void };
  serverStatus?: { value: StatusFilter; onChange: (v: StatusFilter) => void };
  lobbyError?: string | null;
}) {
  const [applied, setApplied] = useState<Partial<Record<ExcelCol, Set<string>>>>({});
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [menu, setMenu] = useState<null | { col: ExcelCol; rect: DOMRect }>(null);
  const [draft, setDraft] = useState<Set<string>>(() => new Set());
  const [draftServerSearch, setDraftServerSearch] = useState("");
  const [draftServerStatus, setDraftServerStatus] = useState<StatusFilter>("all");
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [colWidths, setColWidths] = useState<number[]>(() => readLobbyColWidths());
  const [tableFs, setTableFs] = useState(false);
  const colDragRef = useRef<{ startX: number; idx: number; startWidths: number[] } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(LOBBY_COL_WIDTHS_KEY, JSON.stringify(colWidths));
    } catch {
      /* ignore */
    }
  }, [colWidths]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = colDragRef.current;
      if (!d) return;
      const { idx, startWidths, startX } = d;
      const dx = e.clientX - startX;
      const sum = startWidths[idx]! + startWidths[idx + 1]!;
      const rawLeft = startWidths[idx]! + dx;
      const left = Math.min(Math.max(LOBBY_COL_MINS[idx]!, rawLeft), sum - LOBBY_COL_MINS[idx + 1]!);
      const right = sum - left;
      setColWidths((prev) => {
        const next = [...prev];
        next[idx] = left;
        next[idx + 1] = right;
        return next;
      });
    };
    const onUp = () => {
      colDragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  function beginColResize(idx: number) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      colDragRef.current = { startX: e.clientX, idx, startWidths: [...colWidths] };
    };
  }

  const pickSort = useCallback((k: SortKey) => {
    setSortKey((prev) => {
      if (prev !== k) {
        setSortDir("asc");
        return k;
      }
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return k;
    });
  }, []);

  const sortBtn = (active: boolean) =>
    `min-w-0 flex-1 rounded px-0.5 py-0.5 text-left text-xs font-semibold uppercase tracking-wide outline-none ring-sky-500/30 focus-visible:ring-2 ${
      active
        ? isLight
          ? "text-sky-800"
          : "text-sky-300"
        : isLight
          ? "text-zinc-700 hover:bg-zinc-200/80"
          : "text-zinc-300 hover:bg-zinc-800/60"
    }`;

  const filterIconBtn = `shrink-0 rounded p-1 outline-none ring-sky-500/30 focus-visible:ring-2 ${
    isLight ? "hover:bg-zinc-200/90" : "hover:bg-zinc-700/80"
  }`;

  const popoverInput = `w-full rounded border px-2 py-1.5 text-sm outline-none ring-sky-500/30 focus:ring-2 ${
    isLight ? "border-zinc-300 bg-white text-zinc-900" : "border-zinc-600 bg-zinc-950 text-zinc-100"
  }`;

  const optionsByCol = useMemo(() => {
    const themes = [...new Set(rows.map((r) => r.themeSanitized))].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    const statuses = [...new Set(rows.map((r) => r.status || ""))].sort();
    const stickers = [...new Set(rows.map((r) => stickerTok(r.stickerCount)))].sort((a, b) => {
      if (a === "__null__") return 1;
      if (b === "__null__") return -1;
      return Number(a) - Number(b);
    });
    const slugs = [...new Set(rows.map((r) => r.slug))].sort();
    const days = [...new Set(rows.map((r) => dayKey(r.dateIso)))].sort();
    return {
      fav: [
        { v: "1", l: "В избранном" },
        { v: "0", l: "Не в избранном" },
      ],
      theme: themes.map((t) => ({ v: t, l: t })),
      status: statuses.map((s) => ({ v: s, l: statusTextRu(s) })),
      stickers: stickers.map((t) => ({ v: t, l: stickerTokLabel(t) })),
      date: days.map((d) => ({ v: d, l: formatDayLabel(d) })),
      slug: slugs.map((s) => ({ v: s, l: s })),
    } satisfies Record<ExcelCol, { v: string; l: string }[]>;
  }, [rows, favRevision]);

  function openFilterMenu(col: ExcelCol, anchorEl: HTMLElement) {
    const rect = anchorEl.getBoundingClientRect();
    const opts = optionsByCol[col];
    const allSet = new Set(opts.map((o) => o.v));
    const cur = applied[col];
    const nextDraft = cur && cur.size > 0 ? new Set(cur) : new Set(allSet);
    setDraft(nextDraft);
    if (col === "theme" && tab === "search" && serverSearch) setDraftServerSearch(serverSearch.value);
    if (col === "status" && tab === "search" && serverStatus) setDraftServerStatus(serverStatus.value);
    setMenu({ col, rect });
  }

  function cancelFilterMenu() {
    setMenu(null);
  }

  function commitFilterMenu() {
    if (!menu) return;
    const { col } = menu;
    if (col === "theme" && tab === "search" && serverSearch) {
      serverSearch.onChange(draftServerSearch);
    }
    if (col === "status" && tab === "search" && serverStatus) {
      serverStatus.onChange(draftServerStatus);
    }
    const opts = optionsByCol[col];
    const allSet = new Set(opts.map((o) => o.v));
    const isFull = opts.length > 0 && draft.size === allSet.size && [...allSet].every((v) => draft.has(v));
    setApplied((prev) => {
      const next = { ...prev };
      if (col === "status" && tab === "search") {
        delete next.status;
      } else {
        if (isFull || opts.length === 0) delete next[col];
        else next[col] = new Set(draft);
      }
      return next;
    });
    setMenu(null);
  }

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelFilterMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (popoverRef.current?.contains(e.target as Node)) return;
      setMenu(null);
    };
    const id = window.requestAnimationFrame(() => {
      window.addEventListener("pointerdown", onDown, true);
    });
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [menu]);

  const processedRows = useMemo(() => {
    const favs = getFavoriteSlugs();
    let out = rows.filter((r) => {
      const favTok = favs.includes(r.slug) ? "1" : "0";
      if (applied.fav && !applied.fav.has(favTok)) return false;
      if (applied.theme && !applied.theme.has(r.themeSanitized)) return false;
      if (tab !== "search" && applied.status && !applied.status.has(r.status || "")) return false;
      if (applied.stickers && !applied.stickers.has(stickerTok(r.stickerCount))) return false;
      if (applied.date && !applied.date.has(dayKey(r.dateIso))) return false;
      if (applied.slug && !applied.slug.has(r.slug)) return false;
      return true;
    });
    if (sortKey) out = [...out].sort((a, b) => compareRows(a, b, sortKey, sortDir));
    return out;
  }, [rows, applied, sortKey, sortDir, tab, favRevision]);

  function colFilterActive(col: ExcelCol): boolean {
    const s = applied[col];
    if (!s) return false;
    const opts = optionsByCol[col];
    if (opts.length === 0) return false;
    const all = new Set(opts.map((o) => o.v));
    if (s.size !== all.size) return true;
    for (const x of all) if (!s.has(x)) return true;
    return false;
  }

  const themeFunnelActive = colFilterActive("theme") || (tab === "search" && !!serverSearch?.value?.trim());
  const statusFunnelActive = colFilterActive("status") || (tab === "search" && serverStatus?.value !== "all");

  const shell = `overflow-x-auto text-sm ${isLight ? "bg-white" : "bg-zinc-900/50"} ${isRounded ? "rounded-b-lg" : ""}`;
  const fsRoot = `fixed inset-0 z-[450] flex flex-col text-sm ${isLight ? "bg-zinc-50 text-zinc-900" : "bg-zinc-950 text-zinc-100"}`;
  const thead = isLight ? "border-b border-zinc-200 bg-zinc-50" : "border-b border-zinc-700 bg-zinc-800/80";
  const rowBorder = isLight ? "border-zinc-100 hover:bg-zinc-50" : "border-zinc-700/80 hover:bg-zinc-800/60";

  const emptyFiltered = !loading && rows.length > 0 && processedRows.length === 0;
  const emptyBase = !loading && rows.length === 0;
  const tbodyMessage = emptyBase ? emptyMessage : emptyFiltered ? "Нет строк по текущим фильтрам." : null;

  const popoverW = 280;
  const popoverLeft =
    menu && typeof window !== "undefined"
      ? Math.min(Math.max(8, menu.rect.right - popoverW), window.innerWidth - popoverW - 8)
      : 0;
  const popoverTop = menu ? menu.rect.bottom + 6 : 0;

  const optsForMenu = menu ? optionsByCol[menu.col] : [];
  const allValsForMenu = optsForMenu.map((o) => o.v);
  const allSelectedForMenu = allValsForMenu.length > 0 && allValsForMenu.every((v) => draft.has(v));

  function toggleDraftValue(v: string) {
    setDraft((prev) => {
      const n = new Set(prev);
      if (n.has(v)) n.delete(v);
      else n.add(v);
      return n;
    });
  }

  function toggleSelectAllMenu() {
    if (allSelectedForMenu) setDraft(new Set());
    else setDraft(new Set(allValsForMenu));
  }

  const fsBtnClass = `rounded p-2 ${isLight ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-200 text-zinc-900 hover:bg-white"}`;

  return (
    <div className={tableFs ? fsRoot : shell}>
      {tableFs ? (
        <div
          className={`flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2 ${
            isLight ? "border-zinc-200 bg-white" : "border-zinc-700 bg-zinc-900"
          }`}
        >
          <span className="text-sm font-semibold">Таблица комнат</span>
          <button type="button" className={fsBtnClass} title="Выйти из полноэкранного режима" aria-label="Выйти из полноэкранного режима" onClick={() => setTableFs(false)}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          </button>
        </div>
      ) : (
        <div className={`flex justify-end border-b px-2 py-1 ${isLight ? "border-zinc-200 bg-zinc-50/90" : "border-zinc-700 bg-zinc-900/80"}`}>
          <button
            type="button"
            className={fsBtnClass}
            title="Таблица на весь экран"
            aria-label="Таблица на весь экран"
            onClick={() => setTableFs(true)}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>
      )}
      {tab === "search" && lobbyError ? (
        <div className={`border-b px-3 py-2 text-sm text-red-400 ${isLight ? "border-red-200 bg-red-50/80" : "border-red-900/50 bg-red-950/30"}`}>
          {lobbyError}
        </div>
      ) : null}
      <div className={tableFs ? "min-h-0 flex-1 overflow-auto" : "overflow-x-auto"}>
        <table className="w-full min-w-[640px] table-fixed border-collapse text-left">
          <colgroup>
            {colWidths.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr className={thead}>
              <th className="relative min-w-0 px-2 py-2 align-top text-xs font-normal">
                <div className="flex items-center justify-between gap-0.5">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">★</span>
                  <button
                    type="button"
                    className={filterIconBtn}
                    aria-label="Фильтр по избранному"
                    onClick={(e) => openFilterMenu("fav", e.currentTarget)}
                  >
                    <FilterFunnelIcon active={colFilterActive("fav")} />
                  </button>
                </div>
                <span
                  className={`absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none ${
                    isLight ? "hover:bg-sky-500/35" : "hover:bg-sky-400/35"
                  }`}
                  onMouseDown={beginColResize(0)}
                  aria-hidden
                />
              </th>
              <th className="relative min-w-0 px-2 py-2 align-top">
              <div className="flex items-center gap-0.5">
                <button type="button" className={sortBtn(sortKey === "theme")} onClick={() => pickSort("theme")}>
                  <span>Тема</span>
                  <span className="tabular-nums opacity-70" aria-hidden>
                    {sortKey === "theme" ? (sortDir === "asc" ? "↑" : "↓") : "·"}
                  </span>
                </button>
                <button
                  type="button"
                  className={filterIconBtn}
                  aria-label="Фильтр по теме"
                  onClick={(e) => openFilterMenu("theme", e.currentTarget)}
                >
                  <FilterFunnelIcon active={themeFunnelActive} />
                </button>
              </div>
                <span
                  className={`absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none ${
                    isLight ? "hover:bg-sky-500/35" : "hover:bg-sky-400/35"
                  }`}
                  onMouseDown={beginColResize(1)}
                  aria-hidden
                />
            </th>
            <th className="relative min-w-0 px-2 py-2 align-top">
              <div className="flex items-center gap-0.5">
                <button type="button" className={sortBtn(sortKey === "status")} onClick={() => pickSort("status")}>
                  <span>Статус</span>
                  <span className="tabular-nums opacity-70" aria-hidden>
                    {sortKey === "status" ? (sortDir === "asc" ? "↑" : "↓") : "·"}
                  </span>
                </button>
                <button
                  type="button"
                  className={filterIconBtn}
                  aria-label="Фильтр по статусу"
                  onClick={(e) => openFilterMenu("status", e.currentTarget)}
                >
                  <FilterFunnelIcon active={statusFunnelActive} />
                </button>
              </div>
                <span
                  className={`absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none ${
                    isLight ? "hover:bg-sky-500/35" : "hover:bg-sky-400/35"
                  }`}
                  onMouseDown={beginColResize(2)}
                  aria-hidden
                />
            </th>
            <th className="relative min-w-0 px-2 py-2 align-top">
              <div className="flex items-center gap-0.5">
                <button type="button" className={sortBtn(sortKey === "stickers")} onClick={() => pickSort("stickers")}>
                  <span>Стикеры</span>
                  <span className="tabular-nums opacity-70" aria-hidden>
                    {sortKey === "stickers" ? (sortDir === "asc" ? "↑" : "↓") : "·"}
                  </span>
                </button>
                <button
                  type="button"
                  className={filterIconBtn}
                  aria-label="Фильтр по числу стикеров"
                  onClick={(e) => openFilterMenu("stickers", e.currentTarget)}
                >
                  <FilterFunnelIcon active={colFilterActive("stickers")} />
                </button>
              </div>
                <span
                  className={`absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none ${
                    isLight ? "hover:bg-sky-500/35" : "hover:bg-sky-400/35"
                  }`}
                  onMouseDown={beginColResize(3)}
                  aria-hidden
                />
            </th>
            <th className="relative min-w-0 px-2 py-2 align-top">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-0.5">
                  <button type="button" className={sortBtn(sortKey === "date")} onClick={() => pickSort("date")}>
                    <span>Дата</span>
                    <span className="tabular-nums opacity-70" aria-hidden>
                      {sortKey === "date" ? (sortDir === "asc" ? "↑" : "↓") : "·"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={filterIconBtn}
                    aria-label="Фильтр по дате"
                    onClick={(e) => openFilterMenu("date", e.currentTarget)}
                  >
                    <FilterFunnelIcon active={colFilterActive("date")} />
                  </button>
                </div>
                <span className={`text-[0.65rem] leading-tight ${isLight ? "text-zinc-500" : "text-zinc-500"}`}>
                  {tab === "history" ? "посещение" : tab === "favorites" ? "посещ. / создана" : "создана"}
                </span>
              </div>
                <span
                  className={`absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none ${
                    isLight ? "hover:bg-sky-500/35" : "hover:bg-sky-400/35"
                  }`}
                  onMouseDown={beginColResize(4)}
                  aria-hidden
                />
            </th>
            <th className="min-w-0 px-2 py-2 align-top">
              <div className="flex items-center gap-0.5">
                <button type="button" className={sortBtn(sortKey === "slug")} onClick={() => pickSort("slug")}>
                  <span>Комната</span>
                  <span className="tabular-nums opacity-70" aria-hidden>
                    {sortKey === "slug" ? (sortDir === "asc" ? "↑" : "↓") : "·"}
                  </span>
                </button>
                <button
                  type="button"
                  className={filterIconBtn}
                  aria-label="Фильтр по коду комнаты"
                  onClick={(e) => openFilterMenu("slug", e.currentTarget)}
                >
                  <FilterFunnelIcon active={colFilterActive("slug")} />
                </button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr className={`border-t ${rowBorder}`}>
              <td colSpan={6} className={`px-3 py-10 text-center ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                Загрузка…
              </td>
            </tr>
          ) : tbodyMessage ? (
            <tr className={`border-t ${rowBorder}`}>
              <td colSpan={6} className={`px-3 py-10 text-center ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                {tbodyMessage}
              </td>
            </tr>
          ) : (
            processedRows.map((r) => {
              const fav = getFavoriteSlugs().includes(r.slug);
              return (
                <tr key={r.slug} className={`border-t ${rowBorder}`}>
                  <td className="px-2 py-2 align-middle">
                    <button
                      type="button"
                      title={fav ? "Убрать из избранного" : "В избранное"}
                      className={`rounded p-1 ${fav ? "text-amber-500" : isLight ? "text-zinc-400" : "text-zinc-500"}`}
                      onClick={() => {
                        toggleFavoriteSlug(r.slug);
                        onFavChange();
                      }}
                    >
                      {fav ? "★" : "☆"}
                    </button>
                  </td>
                  <td className="min-w-0 px-2 py-2 align-middle">
                    <Link className="block truncate font-medium text-sky-600 underline-offset-2 hover:underline" to={`/r/${r.slug}`}>
                      {r.themeSanitized}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 align-middle">
                    <StatusCell status={r.status} isLight={isLight} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 align-middle tabular-nums opacity-90">
                    {r.stickerCount == null ? "—" : r.stickerCount}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 align-middle opacity-80">{formatCellDate(r.dateIso)}</td>
                  <td className="px-2 py-2 align-middle">
                    <code className={`text-xs ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>{r.slug}</code>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      </div>

      {menu &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[200] cursor-default bg-black/25"
              aria-label="Закрыть фильтр"
              onClick={cancelFilterMenu}
            />
            <div
              ref={popoverRef}
              role="dialog"
              aria-modal="true"
              className={`fixed z-[201] flex max-h-[min(480px,80vh)] w-[280px] flex-col overflow-hidden rounded-lg border shadow-xl ${
                isLight ? "border-zinc-200 bg-white text-zinc-900" : "border-zinc-600 bg-zinc-900 text-zinc-100"
              }`}
              style={{ top: popoverTop, left: popoverLeft, width: popoverW }}
            >
              <div className="border-b px-3 py-2 text-sm font-medium">
                {menu.col === "fav"
                  ? "Избранное"
                  : menu.col === "theme"
                    ? "Тема"
                    : menu.col === "status"
                      ? "Статус"
                      : menu.col === "stickers"
                        ? "Стикеры"
                        : menu.col === "date"
                          ? "Дата"
                          : "Комната"}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-sm">
                {menu.col === "status" && tab === "search" && serverStatus ? (
                  <div className="space-y-2">
                    <p className="text-xs opacity-70">Какие встречи запрашивать с сервера</p>
                    {(
                      [
                        ["all", "Все"],
                        ["live", "Идут"],
                        ["ended", "Завершённые"],
                      ] as const
                    ).map(([val, lbl]) => (
                      <label key={val} className="flex cursor-pointer items-center gap-2">
                        <input type="radio" name="srv-status" checked={draftServerStatus === val} onChange={() => setDraftServerStatus(val)} />
                        {lbl}
                      </label>
                    ))}
                  </div>
                ) : (
                  <>
                    {menu.col === "theme" && tab === "search" && serverSearch ? (
                      <div className="mb-3 space-y-1 border-b pb-3">
                        <label className="text-xs font-medium opacity-80">Запрос к серверу</label>
                        <input
                          type="search"
                          value={draftServerSearch}
                          onChange={(e) => setDraftServerSearch(e.target.value)}
                          className={popoverInput}
                          placeholder="Тема или код…"
                        />
                      </div>
                    ) : null}
                    {optsForMenu.length === 0 ? (
                      <p className="text-xs opacity-70">Нет значений в текущем списке.</p>
                    ) : (
                      <>
                        <label className="mb-2 flex cursor-pointer items-center gap-2 border-b pb-2 text-sm font-medium">
                          <input type="checkbox" checked={allSelectedForMenu} onChange={toggleSelectAllMenu} />
                          (все)
                        </label>
                        <ul className="space-y-1.5">
                          {optsForMenu.map((o) => (
                            <li key={`${menu.col}:${o.v}`}>
                              <label className="flex cursor-pointer items-start gap-2">
                                <input type="checkbox" className="mt-0.5 shrink-0" checked={draft.has(o.v)} onChange={() => toggleDraftValue(o.v)} />
                                <span className="min-w-0 break-words">{o.l}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                )}
              </div>
              <div className={`flex justify-end gap-2 border-t px-3 py-2 ${isLight ? "border-zinc-200 bg-zinc-50" : "border-zinc-600 bg-zinc-950/80"}`}>
                <button
                  type="button"
                  className={`rounded px-3 py-1.5 text-sm ${isLight ? "text-zinc-700 hover:bg-zinc-200" : "text-zinc-300 hover:bg-zinc-800"}`}
                  onClick={cancelFilterMenu}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500"
                  onClick={commitFilterMenu}
                >
                  OK
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { themeMode, toggleTheme } = useAppTheme();
  const { cornerMode, toggleCorners } = useAppCorners();
  const isLight = themeMode === "light";
  const isRounded = cornerMode === "rounded";
  const [theme, setTheme] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createKind, setCreateKind] = useState<RoomCreateKind>("retro");
  const [createListedInLobby, setCreateListedInLobby] = useState(true);
  const [createJoinPassword, setCreateJoinPassword] = useState("");

  const [lobbyRooms, setLobbyRooms] = useState<LobbyRoomDto[]>([]);
  const [lobbyLoading, setLobbyLoading] = useState(true);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [favTick, setFavTick] = useState(0);
  const [authUser, setAuthUser] = useState<AuthUserDto | null>(null);
  const [authGate, setAuthGate] = useState<"pending" | "ok">("pending");
  const [mainTab, setMainTab] = useState<HomeMainTab>("history");
  const [aboutOpen, setAboutOpen] = useState(false);
  const lobbyReloadTimerRef = useRef<number | null>(null);

  const bumpFav = useCallback(() => setFavTick((x) => x + 1), []);

  useEffect(() => {
    if (!createModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCreateModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createModalOpen]);

  useEffect(() => {
    void fetchAuthMe().then((u) => {
      if (!u) {
        navigate("/", { replace: true });
        return;
      }
      setAuthUser(u);
      setAuthGate("ok");
    });
  }, [navigate]);

  const visitedList = useMemo(() => getVisitedRooms(), [location.key, favTick]);

  const loadLobby = useCallback(async () => {
    setLobbyLoading(true);
    setLobbyError(null);
    try {
      const { rooms } = await fetchRoomsLobby({ q: searchQ || undefined, status: statusFilter, limit: 80 });
      setLobbyRooms(rooms);
    } catch {
      setLobbyError("Не удалось загрузить список комнат");
      setLobbyRooms([]);
    } finally {
      setLobbyLoading(false);
    }
  }, [searchQ, statusFilter]);

  useEffect(() => {
    void loadLobby();
  }, [loadLobby]);

  useEffect(() => {
    const s = createAppSocket();
    s.on("connect", () => {
      s.emit("joinLobby", () => {});
    });
    const scheduleReload = () => {
      if (lobbyReloadTimerRef.current != null) window.clearTimeout(lobbyReloadTimerRef.current);
      lobbyReloadTimerRef.current = window.setTimeout(() => {
        lobbyReloadTimerRef.current = null;
        void loadLobby();
      }, 450);
    };
    s.on("lobby:patch", scheduleReload);
    s.connect();
    return () => {
      if (lobbyReloadTimerRef.current != null) window.clearTimeout(lobbyReloadTimerRef.current);
      s.removeAllListeners();
      s.close();
    };
  }, [loadLobby]);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchQ(searchInput.trim()), 320);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  async function submitCreateRoom() {
    setError(null);
    setLoading(true);
    try {
      const room = await createRoom(theme.trim(), {
        kind: createKind,
        listedInLobby: createListedInLobby,
        ...(createJoinPassword.trim() ? { joinPassword: createJoinPassword.trim() } : {}),
      });
      setCreateModalOpen(false);
      navigate(`/r/${room.slug}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать комнату");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setCreateKind("retro");
    setTheme("");
    setCreateListedInLobby(true);
    setCreateJoinPassword("");
    setError(null);
    setCreateModalOpen(true);
  }

  const favoriteSlugs = useMemo(() => getFavoriteSlugs(), [favTick]);
  const favoriteRows = useMemo(() => {
    const map = new Map(lobbyRooms.map((r) => [r.slug, r]));
    return favoriteSlugs.map((slug) => {
      const r = map.get(slug);
      if (r) return { slug, label: r.themeSanitized, status: r.status };
      const v = visitedList.find((x) => x.slug === slug);
      return { slug, label: v?.themeSanitized ?? slug, status: v?.status };
    });
  }, [favoriteSlugs, lobbyRooms, visitedList]);

  const recentStrip = useMemo(() => {
    return visitedList.slice(0, 12).map((v: VisitedRoomEntry) => ({
      slug: v.slug,
      label: v.themeSanitized,
      status: v.status,
    }));
  }, [visitedList]);

  const lobbyBySlug = useMemo(() => new Map(lobbyRooms.map((r) => [r.slug, r])), [lobbyRooms]);

  const { tableRows, emptyMessage, tableLoading } = useMemo(() => {
    if (mainTab === "search") {
      return {
        tableRows: lobbyRooms.map((r) => ({
          slug: r.slug,
          themeSanitized: r.themeSanitized,
          status: r.status,
          stickerCount: r.stickerCount,
          dateIso: r.createdAt,
        })),
        emptyMessage: "Комнат не найдено.",
        tableLoading: lobbyLoading,
      };
    }
    if (mainTab === "history") {
      return {
        tableRows: visitedList.map((e) => ({
          slug: e.slug,
          themeSanitized: e.themeSanitized,
          status: e.status,
          stickerCount: lobbyBySlug.get(e.slug)?.stickerCount ?? null,
          dateIso: e.lastVisitedAt,
        })),
        emptyMessage: "Пока нет посещений — зайдите в комнату по ссылке, и она появится здесь.",
        tableLoading: false,
      };
    }
    return {
      tableRows: favoriteRows.map((fr) => {
        const lr = lobbyBySlug.get(fr.slug);
        const v = visitedList.find((x) => x.slug === fr.slug);
        return {
          slug: fr.slug,
          themeSanitized: fr.label,
          status: fr.status ?? "",
          stickerCount: lr?.stickerCount ?? null,
          dateIso: v?.lastVisitedAt ?? lr?.createdAt ?? "",
        };
      }),
      emptyMessage: "Нет избранных комнат. Отметьте звёздочкой в таблице или на чипах выше.",
      tableLoading: false,
    };
  }, [mainTab, visitedList, favoriteRows, lobbyRooms, lobbyBySlug, lobbyLoading]);

  if (authGate !== "ok" || !authUser) {
    return (
      <div className={`flex min-h-screen items-center justify-center px-4 ${isLight ? "bg-zinc-50 text-zinc-600" : "bg-zinc-950 text-zinc-400"}`}>
        <p className="text-sm">Загрузка…</p>
      </div>
    );
  }

  const homeHelpBody = (
    <>
      <p className={`font-medium ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>Главный экран после входа</p>
      <p className="mt-2 opacity-90">
        Здесь вы создаёте комнаты, смотрите недавние визиты и работаете с таблицей комнат. Ниже — по разделам и кнопкам в шапке (на одной линии с контентом,
        как в комнате).
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 opacity-90">
        <li>
          <strong>Новая комната</strong> — кнопка открывает окно: тип доски (ретро или пустая) и название. После создания откроется сама комната; ссылку можно
          отправить участникам из шапки комнаты (копирование и «Поделиться»).
        </li>
        <li>
          <strong>Недавно у вас</strong> — чипы последних комнат на этом устройстве; звёздочка добавляет в избранное (хранится в браузере).
        </li>
        <li>
          <strong>Вкладки таблицы</strong>: «История посещений» и «Избранное» — локально; «Поиск» — список с сервера. Фильтры по колонкам — по иконке воронки,
          сортировка — по заголовку столбца. Ширину колонок можно менять, потянув разделитель у правого края заголовка; над таблицей — полноэкранный режим.
        </li>
        <li>
          <strong>Справка</strong> — как в комнате: перетаскивание за заголовок, «на весь экран», свернуть в «−» или снова в иконку «?» в шапке.
        </li>
        <li>
          <strong>Меню</strong> — профиль, настройки, мастерская, о программе, выход из аккаунта.
        </li>
      </ul>
    </>
  );

  return (
    <RetrogenDockableHelpRoot
      isLight={isLight}
      title="Справка: лобби"
      onHelpOpenCloseAbout={() => setAboutOpen(false)}
      body={homeHelpBody}
    >
      <div className={`min-h-screen px-4 py-8 ${isLight ? "bg-zinc-50 text-zinc-900" : "bg-zinc-950 text-zinc-100"}`}>
        <div className="mx-auto w-full max-w-5xl">
          <div
            className={`sticky top-0 z-30 mb-6 flex flex-wrap items-center justify-end gap-2 border-b pb-3 pt-1 backdrop-blur ${
              isLight ? "border-zinc-200/90 bg-zinc-50/85" : "border-zinc-700/90 bg-zinc-950/85"
            }`}
          >
            <ThemeCornersIconButtons
              isLight={isLight}
              isRounded={isRounded}
              toggleTheme={toggleTheme}
              toggleCorners={toggleCorners}
            />
            <MessengerNavIconButton isLight={isLight} />
            <RetrogenDockableHelpToggle isLight={isLight} />
            <RetrogenOverflowMenu
              isLight={isLight}
              onAbout={() => setAboutOpen(true)}
              authVariant="user"
              showLobbyLink={false}
              onLogout={() => {
                logoutAccount();
                setAuthUser(null);
                navigate("/", { replace: true });
              }}
            />
          </div>

          <div className="flex flex-col gap-8">
        <header>
          <h1 className={`text-3xl font-semibold tracking-tight ${isRounded ? "rounded-sm" : ""}`}>Retrogen</h1>
          <p className={`mt-2 max-w-2xl ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
            Создайте комнату (ретро или пустую доску), смотрите недавние визиты и историю на этом устройстве. Избранное и история хранятся в браузере; во вкладке «Поиск» список с сервера — запрос и статус в окне фильтра колонок «Тема» и «Статус», сортировка по заголовку колонки, фильтры по иконке воронки.
          </p>
        </header>

        <section className={`rounded-xl border p-5 ${isLight ? "border-zinc-200 bg-white" : "border-zinc-700 bg-zinc-900/40"}`}>
          <h2 className="text-lg font-semibold">Новая комната</h2>
          <p className={`mt-1 text-sm ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
            Выберите тип доски и название — появится ссылка на комнату для участников.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className={`mt-4 px-5 py-2.5 font-medium text-white ${isRounded ? "rounded-lg" : "rounded-none"} bg-sky-600 hover:bg-sky-500`}
          >
            Создать комнату…
          </button>
        </section>

        {createModalOpen &&
          createPortal(
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Закрыть"
                onClick={() => !loading && setCreateModalOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-room-title"
                className={`relative z-[301] w-full max-w-md rounded-xl border p-5 shadow-xl ${
                  isLight ? "border-zinc-200 bg-white text-zinc-900" : "border-zinc-600 bg-zinc-900 text-zinc-100"
                } ${isRounded ? "rounded-xl" : "rounded-none"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="create-room-title" className="text-lg font-semibold">
                  Новая комната
                </h2>
                <p className={`mt-1 text-sm ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>Тип доски</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setCreateKind("retro")}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      createKind === "retro"
                        ? "border-sky-500 ring-2 ring-sky-500/40"
                        : isLight
                          ? "border-zinc-200 hover:border-zinc-300"
                          : "border-zinc-600 hover:border-zinc-500"
                    }`}
                  >
                    <span className="font-semibold">Ретро</span>
                    <span className={`mt-1 block text-xs ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                      Разогрев, колонки, звезда спринта, оценка — как классическое ретро.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateKind("empty")}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      createKind === "empty"
                        ? "border-sky-500 ring-2 ring-sky-500/40"
                        : isLight
                          ? "border-zinc-200 hover:border-zinc-300"
                          : "border-zinc-600 hover:border-zinc-500"
                    }`}
                  >
                    <span className="font-semibold">Пустая доска</span>
                    <span className={`mt-1 block text-xs ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                      Только свободный холст; блоки можно добавить на доске при необходимости.
                    </span>
                  </button>
                </div>
                <label className="mt-4 block">
                  <span className={`text-sm ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>Название</span>
                  <input
                    className={`mt-1 w-full rounded-lg px-3 py-2 outline-none ${
                      isLight
                        ? "border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400"
                        : "border border-zinc-600 bg-zinc-950 text-white placeholder:text-zinc-600"
                    } ${isRounded ? "rounded-lg" : "rounded-none"}`}
                    placeholder={createKind === "retro" ? "Например: спринт 42" : "Например: мозговой штурм"}
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </label>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={createListedInLobby}
                    onChange={(e) => setCreateListedInLobby(e.target.checked)}
                    disabled={loading}
                    className="rounded border-zinc-400"
                  />
                  <span>Показывать в общем лобби (поиск на главной)</span>
                </label>
                <label className="mt-3 block">
                  <span className={`text-sm ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                    Пароль для входа в комнату (необязательно, от 4 символов)
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className={`mt-1 w-full rounded-lg px-3 py-2 outline-none ${
                      isLight
                        ? "border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400"
                        : "border border-zinc-600 bg-zinc-950 text-white placeholder:text-zinc-600"
                    } ${isRounded ? "rounded-lg" : "rounded-none"}`}
                    placeholder="Пусто — без пароля"
                    value={createJoinPassword}
                    onChange={(e) => setCreateJoinPassword(e.target.value)}
                    disabled={loading}
                  />
                </label>
                {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    className={`rounded-lg px-4 py-2 text-sm ${isLight ? "text-zinc-700 hover:bg-zinc-100" : "text-zinc-300 hover:bg-zinc-800"}`}
                    onClick={() => setCreateModalOpen(false)}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    disabled={loading || theme.trim().length < 2}
                    className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40 ${isRounded ? "rounded-lg" : "rounded-none"} bg-sky-600 hover:bg-sky-500`}
                    onClick={() => void submitCreateRoom()}
                  >
                    {loading ? "Создаём…" : "Создать"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        <section className="space-y-3">
          <h2 className={`text-sm font-semibold uppercase tracking-wide ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
            Недавно у вас
          </h2>
          {recentStrip.length === 0 ? (
            <p className={`text-sm ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>Пока пусто — откройте любую комнату, и она появится здесь.</p>
          ) : (
            <ul className={`flex flex-wrap gap-2 ${isLight ? "text-zinc-800" : "text-zinc-100"}`}>
              {recentStrip.map((e) => {
                const fav = getFavoriteSlugs().includes(e.slug);
                return (
                  <li
                    key={e.slug}
                    className={`flex items-center gap-1 rounded-full border px-2 py-1 text-sm ${
                      isLight ? "border-zinc-200 bg-zinc-50" : "border-zinc-600 bg-zinc-900/60"
                    }`}
                  >
                    <button
                      type="button"
                      className={`shrink-0 rounded px-0.5 ${fav ? "text-amber-500" : "opacity-50 hover:opacity-100"}`}
                      title={fav ? "Убрать из избранного" : "В избранное"}
                      onClick={() => {
                        toggleFavoriteSlug(e.slug);
                        bumpFav();
                      }}
                    >
                      {fav ? "★" : "☆"}
                    </button>
                    <Link className="max-w-[200px] truncate font-medium text-sky-600 underline-offset-2 hover:underline" to={`/r/${e.slug}`}>
                      {e.label}
                    </Link>
                    {e.status === "ended" ? (
                      <span className="text-xs opacity-60">заверш.</span>
                    ) : e.status === "live" ? (
                      <span className="text-xs opacity-60">идёт</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          className={`overflow-hidden rounded-xl border ${
            isLight ? "border-zinc-200 bg-white shadow-sm" : "border-zinc-700 bg-zinc-900/50"
          }`}
        >
          <div
            role="tablist"
            aria-label="Разделы списка комнат"
            className={`flex flex-wrap border-b ${isLight ? "border-zinc-200 bg-zinc-50/90" : "border-zinc-700 bg-zinc-900/80"}`}
          >
            {(
              [
                ["history", "История посещений"],
                ["favorites", "Избранное"],
                ["search", "Поиск"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mainTab === id}
                className={`min-w-[9rem] flex-1 px-3 py-2.5 text-center text-sm font-medium transition-colors sm:min-w-0 sm:flex-1 ${
                  mainTab === id
                    ? isLight
                      ? "-mb-px border-b-2 border-sky-600 bg-white text-sky-900"
                      : "-mb-px border-b-2 border-sky-500 bg-zinc-950/90 text-sky-100"
                    : isLight
                      ? "text-zinc-600 hover:bg-white/70"
                      : "text-zinc-400 hover:bg-zinc-800/50"
                }`}
                onClick={() => setMainTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <HomeRoomsTable
            key={mainTab}
            tab={mainTab}
            rows={tableRows}
            isLight={isLight}
            onFavChange={bumpFav}
            emptyMessage={emptyMessage}
            loading={tableLoading}
            favRevision={favTick}
            serverSearch={mainTab === "search" ? { value: searchInput, onChange: setSearchInput } : undefined}
            serverStatus={mainTab === "search" ? { value: statusFilter, onChange: setStatusFilter } : undefined}
            lobbyError={mainTab === "search" ? lobbyError : null}
            isRounded={isRounded}
          />
        </section>
          </div>
        </div>
      </div>
      <RetrogenDockableAbout open={aboutOpen} onClose={() => setAboutOpen(false)} isLight={isLight} />
    </RetrogenDockableHelpRoot>
  );
}
