import { useRef } from "react";
import { createPortal } from "react-dom";
import { readImageDataUrlFromFile } from "../../lib/messengerAvatar";
import type {
  MessengerAppearanceBgTarget,
  MessengerExtendedGradient,
  MessengerHeroBackgroundId,
  MessengerProfileAppearance,
} from "../../lib/messengerProfileAppearance";
import {
  isGradientBackground,
  isPanelThemeDefault,
  MESSENGER_EXTENDED_GRADIENTS,
  MESSENGER_SETTINGS_BUTTONS,
  patchBackgroundLayer,
  patchSettingsButton,
  SETTINGS_BUTTON_KEYS,
} from "../../lib/messengerProfileAppearance";
import { getMessengerModalPortalRoot } from "../../lib/messengerModalPortal";
import { MessengerModalBackdrop } from "./MessengerModalBackdrop";

type Props = {
  open: boolean;
  target: MessengerAppearanceBgTarget;
  isLight: boolean;
  draft: MessengerProfileAppearance;
  onChange: (next: MessengerProfileAppearance) => void;
  onClose: () => void;
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function modalTitle(target: MessengerAppearanceBgTarget): string {
  if (target.kind === "panel") return "Фон профиля";
  if (target.kind === "hero") return "Фон карточки профиля";
  const btn = MESSENGER_SETTINGS_BUTTONS.find((b) => b.id === target.buttonId);
  return btn ? `Фон: ${btn.label}` : "Фон кнопки";
}

export function MessengerProfileBackgroundModal({ open, target, isLight, draft, onChange, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const title = modalTitle(target);
  const isSettings = target.kind === "settings";

  const selectGradient = (id: MessengerExtendedGradient) => {
    if (isSettings) {
      onChange(patchSettingsButton(draft, target.buttonId, { panelBackground: id, solidColor: "", imageDataUrl: null }));
      return;
    }
    if (target.kind === "panel") {
      onChange(patchBackgroundLayer(draft, "panel", { panelBackground: id, solidColor: "", imageDataUrl: null }));
      return;
    }
    onChange(patchBackgroundLayer(draft, "hero", { background: id, solidColor: "", imageDataUrl: null }));
  };

  const gradientActive = (id: MessengerExtendedGradient) => {
    if (isSettings) {
      const keys = SETTINGS_BUTTON_KEYS[target.buttonId];
      if (draft[keys.background] === "default") return false;
      return !draft[keys.imageDataUrl] && !draft[keys.solidColor] && draft[keys.background] === id;
    }
    if (target.kind === "panel") {
      if (isPanelThemeDefault(draft)) return false;
      return !draft.panelImageDataUrl && !draft.panelSolidColor && draft.panelBackground === id;
    }
    return !draft.heroImageDataUrl && !draft.heroSolidColor && draft.heroBackground === id;
  };

  const imageActive = isSettings
    ? !!draft[SETTINGS_BUTTON_KEYS[target.buttonId].imageDataUrl]
    : target.kind === "panel"
      ? !!draft.panelImageDataUrl
      : !!draft.heroImageDataUrl;

  const currentBgId = (): MessengerHeroBackgroundId | "default" => {
    if (isSettings) return draft[SETTINGS_BUTTON_KEYS[target.buttonId].background] as MessengerHeroBackgroundId;
    if (target.kind === "panel") return draft.panelBackground;
    return draft.heroBackground;
  };

  const extendedFallback = (): MessengerExtendedGradient => {
    const bg = currentBgId();
    if (bg !== "default" && isGradientBackground(bg) && (bg as string).startsWith("e")) {
      return bg as MessengerExtendedGradient;
    }
    return "e1";
  };

  return createPortal(
    <MessengerModalBackdrop zIndexClass="z-[1004]" maxWidthClass="max-w-xl" onBackdropClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="messenger-bg-modal-title"
        className={`flex max-h-[min(88vh,720px)] w-full flex-col overflow-hidden rounded-2xl border shadow-2xl ${
          isLight ? "border-zinc-300 bg-white text-zinc-800" : "border-zinc-600 bg-zinc-900 text-zinc-100"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 ${
            isLight ? "border-zinc-200" : "border-zinc-700"
          }`}
        >
          <h2 id="messenger-bg-modal-title" className="text-base font-semibold">
            {title}
          </h2>
          <button
            type="button"
            className="rounded-md p-1.5 opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="messenger-modal-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div>
            <p className={`mb-2 text-xs font-medium uppercase tracking-wide ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
              Градиенты
            </p>
            <div className="flex flex-wrap gap-2">
              {MESSENGER_EXTENDED_GRADIENTS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  title={g.label}
                  aria-label={g.label}
                  aria-pressed={gradientActive(g.id)}
                  onClick={() => selectGradient(g.id)}
                  className={`size-9 shrink-0 rounded-full shadow-sm ring-2 ring-offset-1 transition-[box-shadow,transform,ring-color] duration-200 ease-out ${
                    isLight ? "ring-offset-white" : "ring-offset-zinc-900"
                  } ${
                    gradientActive(g.id)
                      ? "scale-[1.03] ring-sky-500/80 shadow-[0_0_8px_2px_rgba(56,189,248,0.28)]"
                      : isLight
                        ? "ring-transparent hover:scale-[1.03] hover:shadow-[0_0_8px_2px_rgba(56,189,248,0.22)] hover:ring-sky-300/40"
                        : "ring-transparent hover:scale-[1.03] hover:shadow-[0_0_10px_3px_rgba(255,255,255,0.14)] hover:ring-white/30"
                  }`}
                  style={{ backgroundImage: g.css }}
                />
              ))}
            </div>
          </div>

          <div>
            <p className={`mb-2 text-xs font-medium uppercase tracking-wide ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
              Своя картинка
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`w-full rounded-xl border border-dashed px-3 py-4 text-sm transition-colors ${
                imageActive
                  ? isLight
                    ? "border-sky-500 bg-sky-50 text-sky-900"
                    : "border-sky-500 bg-sky-950/40 text-sky-100"
                  : isLight
                    ? "border-zinc-300 text-zinc-600 hover:border-zinc-400"
                    : "border-zinc-600 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              {imageActive ? "Заменить картинку" : "Загрузить изображение"}
            </button>
            {imageActive ? (
              <button
                type="button"
                className={`mt-2 text-xs ${isLight ? "text-zinc-500 hover:text-zinc-800" : "text-zinc-400 hover:text-zinc-200"}`}
                onClick={() => {
                  const fallback = extendedFallback();
                  if (isSettings) {
                    onChange(
                      patchSettingsButton(draft, target.buttonId, {
                        panelBackground: fallback,
                        solidColor: "",
                        imageDataUrl: null,
                      }),
                    );
                  } else if (target.kind === "panel") {
                    onChange(
                      patchBackgroundLayer(draft, "panel", {
                        panelBackground: fallback,
                        solidColor: "",
                        imageDataUrl: null,
                      }),
                    );
                  } else {
                    onChange(
                      patchBackgroundLayer(draft, "hero", {
                        background: fallback,
                        solidColor: "",
                        imageDataUrl: null,
                      }),
                    );
                  }
                }}
              >
                Убрать картинку
              </button>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                readImageDataUrlFromFile(e.target.files?.[0], (url) => {
                  if (isSettings) {
                    onChange(
                      patchSettingsButton(draft, target.buttonId, {
                        panelBackground: "custom",
                        solidColor: "",
                        imageDataUrl: url,
                      }),
                    );
                  } else if (target.kind === "panel") {
                    onChange(
                      patchBackgroundLayer(draft, "panel", {
                        panelBackground: "custom",
                        solidColor: "",
                        imageDataUrl: url,
                      }),
                    );
                  } else {
                    onChange(
                      patchBackgroundLayer(draft, "hero", {
                        background: "custom",
                        solidColor: "",
                        imageDataUrl: url,
                      }),
                    );
                  }
                });
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <div className={`shrink-0 border-t px-4 py-3 ${isLight ? "border-zinc-200" : "border-zinc-700"}`}>
          <button
            type="button"
            className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
            onClick={onClose}
          >
            Готово
          </button>
        </div>
      </div>
    </MessengerModalBackdrop>,
    getMessengerModalPortalRoot(),
  );
}
