import type { BoardGadgetDto } from "../types";

export function formatGadgetCountdown(endsAtMs: number, nowMs: number): string {
  const msLeft = endsAtMs - nowMs;
  if (msLeft <= 0) return "0:00";
  const secTotal = Math.floor(msLeft / 1000);
  const h = Math.floor(secTotal / 3600);
  const m = Math.floor((secTotal % 3600) / 60);
  const s = secTotal % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function normalizeGadgetList(raw: unknown): BoardGadgetDto[] {
  if (!Array.isArray(raw)) return [];
  const out: BoardGadgetDto[] = [];
  for (const g of raw) {
    if (!g || typeof g !== "object") continue;
    const o = g as Record<string, unknown>;
    if (typeof o.id !== "string") continue;
    const x = Number(o.x);
    const y = Number(o.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const layerZ =
      typeof o.layerZ === "number" && Number.isFinite(o.layerZ) ? o.layerZ : 320 + out.length;

    if (o.kind === "timer") {
      const ends = Number(o.endsAtMs);
      if (!Number.isFinite(ends)) continue;
      out.push({
        id: o.id,
        kind: "timer",
        x,
        y,
        endsAtMs: ends,
        label: typeof o.label === "string" ? o.label : undefined,
        layerZ,
      });
      continue;
    }

    if (o.kind === "randomPick") {
      out.push({
        id: o.id,
        kind: "randomPick",
        x,
        y,
        pickedName: typeof o.pickedName === "string" ? o.pickedName : undefined,
        pickedAtMs: typeof o.pickedAtMs === "number" && Number.isFinite(o.pickedAtMs) ? o.pickedAtMs : undefined,
        layerZ,
      });
    }
  }
  return out;
}

export function pickRandomParticipantName(names: string[]): string | null {
  const pool = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function collectRoomParticipantNames(
  cards: Array<{ authorDisplayName?: string | null }>,
  guestName: string,
): string[] {
  const names = new Set<string>();
  const me = guestName.trim();
  if (me) names.add(me);
  for (const c of cards) {
    const n = (c.authorDisplayName ?? "").trim();
    if (n) names.add(n);
  }
  return [...names];
}
