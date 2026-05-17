/** Относительная яркость и контраст (WCAG) для шестнадцатеричных #RRGGBB. */

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function luminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const lin = ([rgb.r, rgb.g, rgb.b] as const).map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

/** Коэффициент контраста между двумя цветами (минимум 1). */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const La = luminance(hexA);
  const Lb = luminance(hexB);
  if (La == null || Lb == null) return null;
  const lighter = Math.max(La, Lb);
  const darker = Math.min(La, Lb);
  return (lighter + 0.05) / (darker + 0.05);
}
