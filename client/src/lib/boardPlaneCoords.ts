/**
 * Геометрия плоскости в координатах «мира» доски (до `transform` viewport).
 * Для новых виджетов: позиция — `boardPointFromClient`, постоянный визуальный размер — `worldSizeFromCssPixels`.
 */
/** Координаты на плоскости (world) из clientX/clientY относительно viewport доски. */
export function boardPointFromClient(
  viewportEl: HTMLElement | null,
  clientX: number,
  clientY: number,
  boardOffset: { x: number; y: number },
  boardScale: number,
): { x: number; y: number } {
  const rect = viewportEl?.getBoundingClientRect();
  const left = rect?.left ?? 0;
  const top = rect?.top ?? 0;
  const cursorX = clientX - left;
  const cursorY = clientY - top;
  const s = Math.max(1e-6, boardScale);
  return {
    x: (cursorX - boardOffset.x) / s,
    y: (cursorY - boardOffset.y) / s,
  };
}

/** Центр видимой области viewport в координатах плоскости. */
export function boardViewportCenterWorld(
  viewportEl: HTMLElement | null,
  boardOffset: { x: number; y: number },
  boardScale: number,
): { x: number; y: number } {
  const w = viewportEl?.clientWidth ?? (typeof window !== "undefined" ? window.innerWidth : 800);
  const h = viewportEl?.clientHeight ?? (typeof window !== "undefined" ? window.innerHeight : 600);
  const rect = viewportEl?.getBoundingClientRect();
  const cx = (rect?.left ?? 0) + w / 2;
  const cy = (rect?.top ?? 0) + h / 2;
  return boardPointFromClient(viewportEl, cx, cy, boardOffset, boardScale);
}

/**
 * Размер в координатах плоскости, чтобы на экране занимать примерно `cssWidth`×`cssHeight` CSS-пикселей
 * при текущем `boardScale` (родитель доски: translate + scale).
 */
export function worldSizeFromCssPixels(cssWidth: number, cssHeight: number, boardScale: number): { width: number; height: number } {
  const s = Math.max(1e-6, boardScale);
  return { width: cssWidth / s, height: cssHeight / s };
}
