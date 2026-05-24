import { toPng } from "html-to-image";
import { DEFAULT_STICKER_SURFACE_HEX } from "./stickerEditorExtras";

export type StickerPngExportResult = {
  blob: Blob;
  copiedToClipboard: boolean;
};

function captureBackgroundColor(element: HTMLElement): string {
  const bg = window.getComputedStyle(element).backgroundColor;
  if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
  const dark =
    document.documentElement.classList.contains("dark") ||
    document.body.classList.contains("dark");
  return dark ? DEFAULT_STICKER_SURFACE_HEX.dark : DEFAULT_STICKER_SURFACE_HEX.light;
}

/** ProseMirror / редактор в off-screen клоне часто не рисуется — заменяем на обычный div с тем же HTML. */
function freezeStickerEditor(sourceCard: HTMLElement, cloneCard: HTMLElement) {
  const srcEditor = sourceCard.querySelector("[data-sticker-editor='true']");
  const cloneEditor = cloneCard.querySelector("[data-sticker-editor='true']");
  if (!(srcEditor instanceof HTMLElement) || !(cloneEditor instanceof HTMLElement)) return;

  const frozen = document.createElement("div");
  frozen.setAttribute("data-sticker-export-text", "true");
  const prose = srcEditor.querySelector(".ProseMirror");
  frozen.innerHTML = prose instanceof HTMLElement ? prose.innerHTML : srcEditor.innerHTML;
  frozen.className = cloneEditor.className;
  frozen.style.cssText = cloneEditor.style.cssText;

  const cs = window.getComputedStyle(srcEditor);
  frozen.style.color = cs.color;
  frozen.style.fontSize = cs.fontSize;
  frozen.style.fontFamily = cs.fontFamily;
  frozen.style.fontWeight = cs.fontWeight;
  frozen.style.lineHeight = cs.lineHeight;
  frozen.style.textAlign = cs.textAlign;
  frozen.style.padding = cs.padding;
  frozen.style.whiteSpace = cs.whiteSpace;
  frozen.style.wordBreak = cs.wordBreak;
  frozen.style.overflow = "visible";
  frozen.style.flex = "1 1 auto";
  frozen.style.minHeight = "0";
  frozen.style.width = "100%";

  cloneEditor.replaceWith(frozen);
}

/** Убрать ручки ресайза и прочий служебный chrome. */
function stripCaptureChrome(cloneCard: HTMLElement) {
  cloneCard
    .querySelectorAll(
      "[class*='cursor-nwse-resize'], [class*='cursor-nesw-resize'], [class*='cursor-nw-resize'], [class*='cursor-sw-resize']",
    )
    .forEach((el) => el.remove());
}

/** Клон вне transform доски; классы Tailwind сохраняем (html-to-image рендерит через браузер). */
function mountStickerCloneForCapture(source: HTMLElement): { wrapper: HTMLDivElement; clone: HTMLElement } {
  const rect = source.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));

  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-sticker-png-capture", "true");
  wrapper.style.cssText = [
    "position:fixed",
    "left:-20000px",
    "top:0",
    `width:${w}px`,
    `height:${h}px`,
    "overflow:visible",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.position = "relative";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.width = `${w}px`;
  clone.style.height = `${h}px`;
  clone.style.transform = "none";
  clone.style.margin = "0";
  clone.style.boxSizing = "border-box";

  stripCaptureChrome(clone);
  freezeStickerEditor(source, clone);

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  return { wrapper, clone };
}

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((r) => r.blob());
}

/** Снимок карточки стикера: текст, реакции, автор, фон и рамка. */
export async function captureElementToPngBlob(
  element: HTMLElement,
  options?: { scale?: number },
): Promise<Blob> {
  const { wrapper, clone } = mountStickerCloneForCapture(element);
  const bg = captureBackgroundColor(element);
  clone.style.backgroundColor = bg;

  const pixelRatio = options?.scale ?? 2;
  const w = clone.offsetWidth;
  const h = clone.offsetHeight;

  try {
    const dataUrl = await toPng(clone, {
      cacheBust: true,
      pixelRatio,
      width: w,
      height: h,
      backgroundColor: bg,
      skipAutoScale: true,
    });
    const blob = await dataUrlToBlob(dataUrl);
    if (!blob.size) throw new Error("empty PNG");
    return blob;
  } catch (firstErr) {
    const dataUrl = await toPng(clone, {
      cacheBust: true,
      pixelRatio: 1,
      width: w,
      height: h,
      backgroundColor: bg,
      skipAutoScale: true,
    });
    return await dataUrlToBlob(dataUrl);
  } finally {
    wrapper.remove();
  }
}

export function downloadPngBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export async function copyPngBlobToClipboard(blob: Blob): Promise<boolean> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") return false;
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}

export async function exportStickerCardToPng(
  cardElement: HTMLElement,
  filename: string,
): Promise<StickerPngExportResult> {
  const blob = await captureElementToPngBlob(cardElement);
  downloadPngBlob(blob, filename);
  const copiedToClipboard = await copyPngBlobToClipboard(blob);
  return { blob, copiedToClipboard };
}
