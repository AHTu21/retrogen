/** Недавние эмодзи, shortcodes, утилиты для редактора стикера. */

const RECENT_EMOJI_KEY = "retrogen:sticker-recent-emoji";
const RECENT_MAX = 12;

/** Код → emoji (расширяемый список). */
export const STICKER_EMOJI_SHORTCODES: Record<string, string> = {
  smile: "🙂",
  grin: "😀",
  joy: "😂",
  wink: "😉",
  think: "🤔",
  sad: "😢",
  heart: "❤️",
  fire: "🔥",
  thumbsup: "👍",
  thumbsdown: "👎",
  check: "✅",
  x: "❌",
  star: "⭐",
  bulb: "💡",
  target: "🎯",
  rocket: "🚀",
  warn: "⚠️",
  pray: "🙏",
  handshake: "🤝",
};

export function loadRecentStickerEmojis(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_EMOJI_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && x.length > 0).slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

export function rememberStickerEmoji(emoji: string) {
  const t = emoji.trim();
  if (!t) return;
  const prev = loadRecentStickerEmojis().filter((e) => e !== t);
  const next = [t, ...prev].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

/** Палитра: недавние первыми, затем пресеты без дублей. */
export function mergeEmojiPalette(recent: string[], presets: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of [...recent, ...presets]) {
    if (seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

const SHORTCODE_RE = /:([a-z0-9_+-]{2,24}):/gi;

/** Заменяет `:smile:` только в текстовых узлах HTML (безопасно для разметки). */
export function expandEmojiShortcodesInHtml(html: string): string {
  if (!html.includes(":")) return html;
  if (typeof document === "undefined") return expandEmojiShortcodesInPlain(html);

  const root = document.createElement("div");
  root.innerHTML = html;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) textNodes.push(n as Text);

  for (const node of textNodes) {
    const src = node.data;
    if (!src.includes(":")) continue;
    const next = src.replace(SHORTCODE_RE, (full, code: string) => {
      const em = STICKER_EMOJI_SHORTCODES[code.toLowerCase()];
      return em ?? full;
    });
    if (next !== src) node.data = next;
  }
  return root.innerHTML;
}

export function expandEmojiShortcodesInPlain(text: string): string {
  return text.replace(SHORTCODE_RE, (full, code: string) => {
    const em = STICKER_EMOJI_SHORTCODES[code.toLowerCase()];
    return em ?? full;
  });
}

/** #RRGGBB из hex/rgb/rgba для контраста. */
export function cssColorToHex(css: string | undefined | null): string | null {
  if (!css) return null;
  const t = css.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(t);
  if (hex) return `#${hex[1]!.toLowerCase()}`;

  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(t);
  if (rgb) {
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    const r = clamp(Number(rgb[1]));
    const g = clamp(Number(rgb[2]));
    const b = clamp(Number(rgb[3]));
    return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  }
  return null;
}

/** Фон стикера по умолчанию (если в planeState нет своего цвета). */
export const DEFAULT_STICKER_SURFACE_HEX = {
  light: "#fffbeb",
  dark: "#292524",
} as const;
