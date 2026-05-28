import { useEffect, useState, type ReactNode } from "react";
import type {
  MessengerAppearanceBgTarget,
  MessengerAvatarShape,
  MessengerNameScale,
  MessengerProfileAppearance,
} from "../../lib/messengerProfileAppearance";
import {
  isExtendedOrCustomSelected,
  isSettingsButtonExtendedOrCustomSelected,
  MESSENGER_DETAILS_LABEL_COLOR_PRESETS,
  MESSENGER_DETAILS_VALUE_COLOR_PRESETS,
  MESSENGER_SETTINGS_BUTTONS,
} from "../../lib/messengerProfileAppearance";
import { MessengerAppearanceBackgroundSection } from "./MessengerAppearanceBackgroundSection";
import { MessengerAppearanceColorField } from "./MessengerAppearanceColorField";
import { MessengerProfileBackgroundModal } from "./MessengerProfileBackgroundModal";

type Props = {
  isLight: boolean;
  applied: MessengerProfileAppearance;
  embedded?: boolean;
  onClose: () => void;
  onApply: (next: MessengerProfileAppearance) => void;
};

function OptionRow({
  label,
  hint,
  children,
  isLight,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  isLight: boolean;
  className?: string;
}) {
  return (
    <div className={`min-w-0 space-y-1.5 ${className}`}>
      <p
        className={`cursor-default text-xs font-medium uppercase tracking-wide ${
          isLight ? "text-zinc-500" : "text-zinc-400"
        } ${hint ? "w-fit border-b border-dotted border-current/40" : ""}`}
        title={hint}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function Chip({
  active,
  isLight,
  onClick,
  children,
  compact,
}: {
  active: boolean;
  isLight: boolean;
  onClick: () => void;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border transition-colors ${
        compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
      } ${
        active
          ? isLight
            ? "border-sky-600 bg-sky-50 text-sky-900"
            : "border-sky-500 bg-sky-950/50 text-sky-100"
          : isLight
            ? "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
            : "border-zinc-600 bg-zinc-800/80 text-zinc-200 hover:border-zinc-500"
      }`}
    >
      {children}
    </button>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function MessengerProfileAppearancePanel({
  isLight,
  applied,
  embedded = false,
  onClose,
  onApply,
}: Props) {
  const [draft, setDraft] = useState(applied);
  const [bgModalTarget, setBgModalTarget] = useState<MessengerAppearanceBgTarget | null>(null);

  useEffect(() => {
    setDraft(applied);
  }, [applied]);

  const patch = (partial: Partial<MessengerProfileAppearance>) => setDraft((d) => ({ ...d, ...partial }));

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${embedded ? "" : "h-full"}`}>
      <MessengerProfileBackgroundModal
        open={bgModalTarget !== null}
        target={bgModalTarget ?? { kind: "hero" }}
        isLight={isLight}
        draft={draft}
        onChange={setDraft}
        onClose={() => setBgModalTarget(null)}
      />

      {!embedded ? (
        <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Оформление профиля</h3>
          <button
            type="button"
            className="rounded-md p-1.5 opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <CloseIcon />
          </button>
        </div>
      ) : null}

      <div
        className={`messenger-modal-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain ${
          embedded ? "px-5 py-4 sm:px-6" : "pb-3"
        }`}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MessengerAppearanceBackgroundSection
            layer="panel"
            label="Фон профиля"
            hint="Фон панели «Профиль»; список чатов и меню слева не меняются"
            isLight={isLight}
            draft={draft}
            onChange={setDraft}
            showThemeDefault
            compact
            moreActive={isExtendedOrCustomSelected(draft, "panel")}
            onOpenMore={() => setBgModalTarget({ kind: "panel" })}
          />

          <MessengerAppearanceBackgroundSection
            layer="hero"
            label="Фон карточки"
            hint="Градиент, цвет или картинка для верхней и нижней карточек профиля"
            isLight={isLight}
            draft={draft}
            onChange={setDraft}
            showThemeDefault
            compact
            moreActive={isExtendedOrCustomSelected(draft, "hero")}
            onOpenMore={() => setBgModalTarget({ kind: "hero" })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <OptionRow label="Аватар" isLight={isLight}>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["circle", "Круг"],
                  ["rounded", "Скруглённый"],
                  ["square", "Квадрат"],
                ] as const satisfies [MessengerAvatarShape, string][]
              ).map(([id, label]) => (
                <Chip
                  key={id}
                  compact
                  active={draft.avatarShape === id}
                  isLight={isLight}
                  onClick={() => patch({ avatarShape: id })}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </OptionRow>

          <OptionRow label="Имя" isLight={isLight}>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["small", "Мелкий"],
                  ["normal", "Обычный"],
                  ["large", "Крупный"],
                ] as const satisfies [MessengerNameScale, string][]
              ).map(([id, label]) => (
                <Chip
                  key={id}
                  compact
                  active={draft.nameScale === id}
                  isLight={isLight}
                  onClick={() => patch({ nameScale: id })}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </OptionRow>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <OptionRow
            label="Цвет полей"
            hint="Названия в блоке о себе: О себе, Город, Тел.…"
            isLight={isLight}
          >
            <MessengerAppearanceColorField
              isLight={isLight}
              compact
              presets={MESSENGER_DETAILS_LABEL_COLOR_PRESETS}
              value={draft.detailsLabelColor}
              onChange={(detailsLabelColor) => patch({ detailsLabelColor })}
            />
          </OptionRow>

          <OptionRow
            label="Цвет значений"
            hint="Текст данных, который вы заполняете в «О себе»"
            isLight={isLight}
          >
            <MessengerAppearanceColorField
              isLight={isLight}
              compact
              presets={MESSENGER_DETAILS_VALUE_COLOR_PRESETS}
              value={draft.detailsValueColor}
              onChange={(detailsValueColor) => patch({ detailsValueColor })}
            />
          </OptionRow>
        </div>

        <div className="space-y-4 border-t border-dashed pt-4 dark:border-zinc-700/80 border-zinc-200">
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${isLight ? "text-zinc-600" : "text-zinc-300"}`}
          >
            Кнопки настроек
          </p>
          <p className={`-mt-2 text-xs ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
            Фон пунктов внизу профиля; текст остаётся светлым
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {MESSENGER_SETTINGS_BUTTONS.map((btn) => (
              <MessengerAppearanceBackgroundSection
                key={btn.id}
                settingsButtonId={btn.id}
                label={btn.label}
                hint="Градиент, цвет или картинка для этой кнопки"
                isLight={isLight}
                draft={draft}
                onChange={setDraft}
                showThemeDefault
                compact
                moreActive={isSettingsButtonExtendedOrCustomSelected(draft, btn.id)}
                onOpenMore={() => setBgModalTarget({ kind: "settings", buttonId: btn.id })}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className={`shrink-0 border-t pt-3 ${embedded ? "px-4 pb-4" : ""} ${
          isLight ? "border-zinc-200" : "border-zinc-700"
        }`}
      >
        <button
          type="button"
          className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
          onClick={() => onApply(draft)}
        >
          Применить
        </button>
      </div>
    </div>
  );
}
