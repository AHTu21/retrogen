/**
 * Связи между стикерами (линии на плоскости) в planeState.connections.
 */

import type { RoomDto } from "../types";

export type StickerConnection = {
  id: string;
  fromCardId: string;
  toCardId: string;
  label?: string;
  stroke?: string;
};

export type PlanePoint = { x: number; y: number };

type CardLayout = { x: number; y: number; width: number; height: number };
type BlockLayout = { x: number; y: number; width: number; height: number };

export function newStickerConnectionId(): string {
  return `conn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parsePlaneConnections(planeState: unknown): StickerConnection[] {
  if (!planeState || typeof planeState !== "object") return [];
  const c = (planeState as { connections?: unknown }).connections;
  if (!Array.isArray(c)) return [];
  return c.filter(
    (x): x is StickerConnection =>
      x != null &&
      typeof x === "object" &&
      typeof (x as StickerConnection).id === "string" &&
      typeof (x as StickerConnection).fromCardId === "string" &&
      typeof (x as StickerConnection).toCardId === "string" &&
      (x as StickerConnection).fromCardId !== (x as StickerConnection).toCardId,
  );
}

export function cardPlaneCenter(
  cardId: string,
  room: RoomDto,
  blockLayouts: Record<string, BlockLayout>,
  cardLayouts: Record<string, CardLayout>,
): PlanePoint | null {
  const card = room.cards.find((c) => c.id === cardId);
  if (!card) return null;
  const bl = blockLayouts[card.blockId];
  const cl = cardLayouts[cardId];
  if (!bl || !cl) return null;
  return {
    x: bl.x + cl.x + cl.width / 2,
    y: bl.y + cl.y + cl.height / 2,
  };
}

/** SVG path: прямая между центрами стикеров. */
export function stickerConnectionLinePath(from: PlanePoint, to: PlanePoint): string {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

export function mergeConnectionsById(local: StickerConnection[], server: StickerConnection[]): StickerConnection[] {
  const m = new Map<string, StickerConnection>();
  for (const x of local) m.set(x.id, x);
  for (const x of server) m.set(x.id, x);
  return [...m.values()];
}
