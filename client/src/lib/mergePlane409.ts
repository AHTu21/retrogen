import { mergeConnectionsById, parsePlaneConnections } from "./stickerConnections";
import { parsePlaneCardTags } from "./stickerTags";
import type { BoardGadgetDto, PlaneShapeDto, PlaneStateDto } from "../types";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function mergeRecord<V>(
  local: Record<string, V>,
  serverUnknown: unknown,
): Record<string, V> {
  const s = asRecord(serverUnknown) as Record<string, V>;
  return { ...local, ...s };
}

function normalizeMeme(raw: unknown): PlaneStateDto["memes"][number] | null {
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

function normalizeGadgets(raw: unknown): BoardGadgetDto[] {
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

function normalizeShapes(raw: unknown): PlaneShapeDto[] {
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

function mergeById<T extends { id: string }>(local: T[], server: T[], emptyServerKeepsLocal: boolean): T[] {
  if (server.length === 0 && local.length > 0 && emptyServerKeepsLocal) return local;
  const m = new Map<string, T>();
  for (const x of local) m.set(x.id, x);
  for (const x of server) m.set(x.id, x);
  return [...m.values()];
}

/**
 * После 409: серверный снимок поверх локального PATCH (сервер выигрывает по совпадающим id),
 * камера (scale/offset) остаётся от клиента.
 */
export function mergePlaneFor409Retry(local: PlaneStateDto, serverRaw: unknown): PlaneStateDto {
  const srv = asRecord(serverRaw);

  const blockLayouts = mergeRecord(local.blockLayouts ?? {}, srv.blockLayouts);
  const cardLayouts = mergeRecord(local.cardLayouts ?? {}, srv.cardLayouts);
  const blockMeta = mergeRecord(local.blockMeta ?? {}, srv.blockMeta);
  const cardMeta = mergeRecord(local.cardMeta ?? {}, srv.cardMeta);

  const localMemes = local.memes ?? [];
  const serverMemes = Array.isArray(srv.memes) ? srv.memes.map(normalizeMeme).filter((x): x is NonNullable<typeof x> => x != null) : [];
  const memes = mergeById(localMemes, serverMemes, true);

  const localG = local.gadgets ?? [];
  const serverG = normalizeGadgets(srv.gadgets);
  const gadgets = mergeById(localG, serverG, true);

  const localShapes = local.planeShapes ?? [];
  const serverShapes = normalizeShapes(srv.planeShapes);
  const planeShapes = mergeById(localShapes, serverShapes, true);

  let cardStyles = { ...(local.cardStyles ?? {}) };
  if ("cardStyles" in srv) {
    cardStyles =
      srv.cardStyles && typeof srv.cardStyles === "object"
        ? { ...cardStyles, ...(srv.cardStyles as Record<string, { backgroundColor?: string }>) }
        : {};
  }

  let blockStyles = { ...(local.blockStyles ?? {}) };
  if ("blockStyles" in srv) {
    blockStyles =
      srv.blockStyles && typeof srv.blockStyles === "object"
        ? { ...blockStyles, ...(srv.blockStyles as Record<string, { backgroundColor?: string }>) }
        : {};
  }

  const cardTags = { ...(local.cardTags ?? {}), ...parsePlaneCardTags(srv) };
  const connections = mergeConnectionsById(local.connections ?? [], parsePlaneConnections(srv));

  return {
    boardScale: local.boardScale,
    boardOffset: local.boardOffset,
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
    connections,
  };
}
