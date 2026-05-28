import type { CSSProperties, ReactNode } from "react";
import type {
  MessengerBackgroundLayer,
  MessengerBasicGradient,
  MessengerProfileAppearance,
  MessengerSettingsButtonId,
} from "../../lib/messengerProfileAppearance";
import {
  isBasicGradientSelected,
  isHeroThemeSelected,
  isPanelThemeSelected,
  isSettingsButtonBasicGradientSelected,
  isSettingsButtonDefault,
  isSettingsButtonSolidPresetSelected,
  isSolidPresetSelected,
  MESSENGER_BASIC_GRADIENTS,
  MESSENGER_HERO_SOLID_PRESETS,
  patchBackgroundLayer,
  patchSettingsButton,
  SETTINGS_BUTTON_KEYS,
} from "../../lib/messengerProfileAppearance";
import { MessengerAppearanceColorField } from "./MessengerAppearanceColorField";

type Props = {
  layer?: MessengerBackgroundLayer;
  settingsButtonId?: MessengerSettingsButtonId;
  label: string;
  hint: string;
  isLight: boolean;
  draft: MessengerProfileAppearance;
  onChange: (next: MessengerProfileAppearance) => void;
  onOpenMore: () => void;
  moreActive: boolean;
  showThemeDefault?: boolean;
  compact?: boolean;
};

function SecondaryActionButton({
  active,
  isLight,
  onClick,
  children,
  title,
  compact,
}: {
  active: boolean;
  isLight: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center rounded-lg border font-semibold transition-colors ${
        compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs"
      } ${
        active
          ? isLight
            ? "border-sky-600 bg-sky-100 text-sky-900 shadow-sm"
            : "border-sky-400 bg-sky-500/25 text-sky-50 shadow-sm"
          : isLight
            ? "border-zinc-300 bg-zinc-100 text-zinc-800 hover:border-zinc-400 hover:bg-zinc-200"
            : "border-zinc-500 bg-zinc-800 text-zinc-100 hover:border-zinc-400 hover:bg-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

function ColorSwatch({
  active,
  isLight,
  title,
  onClick,
  gradientCss,
  solidHex,
  compact,
}: {
  active: boolean;
  isLight: boolean;
  title: string;
  onClick: () => void;
  gradientCss?: string;
  solidHex?: string;
  compact?: boolean;
}) {
  const ringOffset = isLight ? "ring-offset-white" : "ring-offset-zinc-800";
  const hoverGlow = isLight
    ? "hover:shadow-[0_0_8px_2px_rgba(56,189,248,0.22)] hover:ring-sky-300/40"
    : "hover:shadow-[0_0_10px_3px_rgba(255,255,255,0.14)] hover:ring-white/30";
  const style: CSSProperties = gradientCss
    ? { backgroundImage: gradientCss }
    : { backgroundColor: solidHex };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={`${compact ? "size-7 ring-offset-1" : "size-9 ring-offset-2"} shrink-0 rounded-full shadow-sm ring-2 transition-[box-shadow,transform,ring-color] duration-200 ease-out ${ringOffset} ${
        active
          ? "scale-[1.03] ring-sky-400/80 shadow-[0_0_8px_2px_rgba(56,189,248,0.28)]"
          : `ring-transparent hover:scale-[1.03] ${hoverGlow}`
      }`}
      style={style}
    />
  );
}

export function MessengerAppearanceBackgroundSection({
  layer,
  settingsButtonId,
  label,
  hint,
  isLight,
  draft,
  onChange,
  onOpenMore,
  moreActive,
  showThemeDefault,
  compact,
}: Props) {
  const isSettings = settingsButtonId != null;

  const selectBasicGradient = (id: MessengerBasicGradient) => {
    if (isSettings) {
      onChange(
        patchSettingsButton(draft, settingsButtonId, {
          panelBackground: id,
          solidColor: "",
          imageDataUrl: null,
        }),
      );
      return;
    }
    if (layer === "panel") {
      onChange(
        patchBackgroundLayer(draft, "panel", {
          panelBackground: id,
          solidColor: "",
          imageDataUrl: null,
        }),
      );
      return;
    }
    onChange(
      patchBackgroundLayer(draft, "hero", {
        background: id,
        solidColor: "",
        imageDataUrl: null,
      }),
    );
  };

  const selectThemeDefault = () => {
    if (isSettings) {
      onChange(
        patchSettingsButton(draft, settingsButtonId, {
          panelBackground: "default",
          solidColor: "",
          imageDataUrl: null,
        }),
      );
      return;
    }
    if (layer === "hero") {
      onChange(
        patchBackgroundLayer(draft, "hero", {
          background: "g1",
          solidColor: "",
          imageDataUrl: null,
        }),
      );
      return;
    }
    onChange(
      patchBackgroundLayer(draft, "panel", {
        panelBackground: "default",
        solidColor: "",
        imageDataUrl: null,
      }),
    );
  };

  const selectSolidColor = (hex: string) => {
    if (isSettings) {
      onChange(
        patchSettingsButton(draft, settingsButtonId, {
          panelBackground: "g1",
          solidColor: hex,
          imageDataUrl: null,
        }),
      );
      return;
    }
    if (layer === "panel") {
      onChange(
        patchBackgroundLayer(draft, "panel", {
          panelBackground: "g1",
          solidColor: hex,
          imageDataUrl: null,
        }),
      );
      return;
    }
    onChange(
      patchBackgroundLayer(draft, "hero", {
        background: draft.heroBackground === "custom" ? "g1" : draft.heroBackground,
        solidColor: hex,
        imageDataUrl: null,
      }),
    );
  };

  const basicGradientActive = (id: MessengerBasicGradient) =>
    isSettings
      ? isSettingsButtonBasicGradientSelected(draft, settingsButtonId, id)
      : isBasicGradientSelected(draft, layer!, id);

  const solidPresetActive = (hex: string) =>
    isSettings
      ? isSettingsButtonSolidPresetSelected(draft, settingsButtonId, hex)
      : isSolidPresetSelected(draft, layer!, hex);

  const themeDefaultActive = isSettings
    ? isSettingsButtonDefault(draft, settingsButtonId)
    : layer === "hero"
      ? isHeroThemeSelected(draft)
      : isPanelThemeSelected(draft);

  const solidColorValue = isSettings
    ? (draft[SETTINGS_BUTTON_KEYS[settingsButtonId].solidColor] as string)
    : layer === "hero"
      ? draft.heroSolidColor
      : draft.panelSolidColor;

  const clearSolidColor = () => {
    if (isSettings) {
      onChange(
        patchSettingsButton(draft, settingsButtonId, {
          panelBackground: "default",
          solidColor: "",
          imageDataUrl: null,
        }),
      );
      return;
    }
    if (layer === "panel") selectThemeDefault();
    else
      onChange(
        patchBackgroundLayer(draft, "hero", {
          solidColor: "",
          imageDataUrl: null,
        }),
      );
  };

  return (
    <div className={`min-w-0 ${compact ? "space-y-1" : "space-y-1.5"}`}>
      <p
        className={`cursor-default text-xs font-medium uppercase tracking-wide ${
          isLight ? "text-zinc-500" : "text-zinc-400"
        } w-fit border-b border-dotted border-current/40`}
        title={hint}
      >
        {label}
      </p>

      {showThemeDefault ? (
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`w-full text-[10px] font-medium uppercase tracking-wide ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
          >
            Тема
          </p>
          <SecondaryActionButton
            active={themeDefaultActive}
            isLight={isLight}
            title="Как в приложении"
            onClick={selectThemeDefault}
            compact={compact}
          >
            По умолчанию
          </SecondaryActionButton>
        </div>
      ) : null}

      <p
        className={`text-[10px] font-medium uppercase tracking-wide ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
      >
        Градиент
      </p>
      <div className={`flex flex-wrap ${compact ? "gap-1.5" : "gap-2"}`}>
        {MESSENGER_BASIC_GRADIENTS.map((g) => (
          <ColorSwatch
            key={g.id}
            title={g.label}
            isLight={isLight}
            active={basicGradientActive(g.id)}
            onClick={() => selectBasicGradient(g.id)}
            gradientCss={g.css}
            compact={compact}
          />
        ))}
      </div>

      <p
        className={`${compact ? "mt-1" : "mt-1.5"} text-[10px] font-medium uppercase tracking-wide ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
      >
        Цвет
      </p>
      <div className={`flex flex-wrap ${compact ? "gap-1.5" : "gap-2"}`}>
        {MESSENGER_HERO_SOLID_PRESETS.map((c) => (
          <ColorSwatch
            key={c.id}
            title={c.label}
            isLight={isLight}
            active={solidPresetActive(c.hex)}
            onClick={() => selectSolidColor(c.hex)}
            solidHex={c.hex}
            compact={compact}
          />
        ))}
      </div>

      <div className={compact ? "mt-1" : "mt-1.5"}>
        <MessengerAppearanceColorField
          isLight={isLight}
          hidePresets
          compact={compact}
          presets={MESSENGER_HERO_SOLID_PRESETS}
          value={solidColorValue}
          onChange={(solidColor) => {
            if (solidColor) selectSolidColor(solidColor);
            else clearSolidColor();
          }}
        />
      </div>

      <div className={compact ? "mt-1.5" : "mt-2"}>
        <SecondaryActionButton active={moreActive} isLight={isLight} onClick={onOpenMore} compact={compact}>
          Больше
        </SecondaryActionButton>
      </div>
    </div>
  );
}
