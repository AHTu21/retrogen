import type { PlaneStateDto } from "../types";

/** Детерминированная строка для сравнения снимков плоскости (без лишних PATCH на сервер). */
function stableJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortDeep);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) {
    out[k] = sortDeep(obj[k]);
  }
  return out;
}

export function planeStateFingerprint(state: PlaneStateDto): string {
  return stableJson(state);
}
