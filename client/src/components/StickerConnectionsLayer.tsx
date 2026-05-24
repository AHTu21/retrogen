import type { RoomDto } from "../types";
import {
  cardPlaneCenter,
  stickerConnectionLinePath,
  type StickerConnection,
} from "../lib/stickerConnections";

type Layout = { x: number; y: number; width: number; height: number };

type Props = {
  room: RoomDto;
  connections: StickerConnection[];
  blockLayouts: Record<string, Layout>;
  cardLayouts: Record<string, Layout>;
  draftFromCardId: string | null;
  draftHoverCardId: string | null;
  isLight: boolean;
};

export function StickerConnectionsLayer({
  room,
  connections,
  blockLayouts,
  cardLayouts,
  draftFromCardId,
  draftHoverCardId,
  isLight,
}: Props) {
  const stroke = isLight ? "#0ea5e9" : "#38bdf8";
  const draftStroke = isLight ? "#a855f7" : "#c084fc";

  const lines: { id: string; d: string; dashed?: boolean }[] = [];
  for (const c of connections) {
    const a = cardPlaneCenter(c.fromCardId, room, blockLayouts, cardLayouts);
    const b = cardPlaneCenter(c.toCardId, room, blockLayouts, cardLayouts);
    if (!a || !b) continue;
    lines.push({ id: c.id, d: stickerConnectionLinePath(a, b) });
  }

  if (draftFromCardId && draftHoverCardId && draftFromCardId !== draftHoverCardId) {
    const a = cardPlaneCenter(draftFromCardId, room, blockLayouts, cardLayouts);
    const b = cardPlaneCenter(draftHoverCardId, room, blockLayouts, cardLayouts);
    if (a && b) {
      lines.push({
        id: "__draft__",
        d: stickerConnectionLinePath(a, b),
        dashed: true,
      });
    }
  }

  if (lines.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      style={{ width: 1, height: 1, zIndex: 180 }}
      aria-hidden
    >
      {lines.map((ln) => (
        <path
          key={ln.id}
          d={ln.d}
          fill="none"
          stroke={ln.dashed ? draftStroke : stroke}
          strokeWidth={ln.dashed ? 2.5 : 2}
          strokeDasharray={ln.dashed ? "6 4" : undefined}
          strokeLinecap="round"
          opacity={ln.dashed ? 0.85 : 0.7}
        />
      ))}
    </svg>
  );
}
