/** Теги стикеров в planeState.cardTags */

export function normalizeStickerTag(raw: string): string {
  let t = raw.trim().toLowerCase();
  if (!t) return "";
  if (t.startsWith("#")) t = t.slice(1);
  t = t.replace(/\s+/g, "-").replace(/[^a-z0-9а-яё_-]/gi, "");
  return t.slice(0, 32);
}

export function parseStickerTagInput(raw: string): string[] {
  const parts = raw.split(/[,;\s#]+/).map(normalizeStickerTag).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

export function parsePlaneCardTags(planeState: unknown): Record<string, string[]> {
  if (!planeState || typeof planeState !== "object") return {};
  const raw = (planeState as { cardTags?: unknown }).cardTags;
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string[]> = {};
  for (const [cardId, tags] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(tags)) continue;
    const norm = tags.map((t) => (typeof t === "string" ? normalizeStickerTag(t) : "")).filter(Boolean);
    if (norm.length) out[cardId] = norm;
  }
  return out;
}

export function formatStickerTagsForInput(tags: string[] | undefined): string {
  if (!tags?.length) return "";
  return tags.map((t) => `#${t}`).join(" ");
}
