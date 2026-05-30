import type { UserProfilePrefs } from "../../lib/profilePrefs";
import { defaultRoomStylePrefs, effectiveBoardWallpaper } from "../../lib/profilePrefs";
import { normalizeProfileAccent, PROFILE_ACCENT_PRESETS } from "../../lib/profileAccent";
import {
  BOARD_BACKDROP_PRESETS,
  HEADER_TINT_PRESETS,
  normalizeBoardBackdropColor,
  normalizeHeaderTintColor,
} from "../../lib/profileRoomColors";
import type { ProfileDesign } from "./profileDesign";
import type { RoomThemePreset } from "./profileRoomPresets";
import { ProfileCard, ProfileField } from "./profileUi";
import {
  RoomCursorPicker,
  RoomLivePreview,
  RoomPaletteSection,
  RoomQuickThemes,
  RoomStyleResetBar,
  RoomWallpaperOpacity,
  RoomWallpaperStudio,
  SettingColorGroup,
} from "./profileRoomUi";

type Props = {
  d: ProfileDesign;
  prefs: UserProfilePrefs;
  setPrefs: React.Dispatch<React.SetStateAction<UserProfilePrefs>>;
  onWallpaperFile: (f: File | undefined) => void;
  onWallpaperClear: () => void;
  wallpaperSrc?: string | null;
};

export function ProfileRoomPanel({ d, prefs, setPrefs, onWallpaperFile, onWallpaperClear, wallpaperSrc }: Props) {
  const hasWallpaper = !!(wallpaperSrc ?? effectiveBoardWallpaper(prefs));

  const applyTheme = (preset: RoomThemePreset) => {
    setPrefs((p) => ({
      ...p,
      boardBackdrop: preset.boardBackdrop,
      headerTint: preset.headerTint,
      ...(preset.cursorStyle ? { cursorStyle: preset.cursorStyle } : {}),
    }));
  };

  const resetRoomStyle = () => {
    setPrefs((p) => ({ ...p, ...defaultRoomStylePrefs() }));
  };

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-8 overflow-x-clip">
      <RoomStyleResetBar d={d} onReset={resetRoomStyle} />
      <RoomLivePreview d={d} prefs={prefs} wallpaperSrc={wallpaperSrc} />

      <RoomQuickThemes
        d={d}
        boardBackdrop={prefs.boardBackdrop}
        headerTint={prefs.headerTint}
        onApply={applyTheme}
      />

      <RoomPaletteSection d={d}>
        <div className="min-w-0 px-4 py-3.5 sm:px-5 sm:py-4">
          <SettingColorGroup
            d={d}
            title="Фон доски"
            hint="Под колонками «Плюсы / Минусы / Действия»"
            value={prefs.boardBackdrop}
            presets={BOARD_BACKDROP_PRESETS}
            normalize={normalizeBoardBackdropColor}
            onChange={(hex) => setPrefs({ ...prefs, boardBackdrop: hex })}
          />
        </div>
        <div className={`min-w-0 border-t ${d.insetRow} px-4 py-3.5 sm:px-5 sm:py-4`}>
          <SettingColorGroup
            d={d}
            title="Шапка комнаты"
            hint="Панель с названием и участниками"
            value={prefs.headerTint}
            presets={HEADER_TINT_PRESETS}
            normalize={normalizeHeaderTintColor}
            onChange={(hex) => setPrefs({ ...prefs, headerTint: hex })}
          />
        </div>
      </RoomPaletteSection>

      <ProfileCard d={d} title="Акцент профиля" description="Кнопки и выделения здесь, в настройках — не на доске">
        <div className="min-w-0 px-4 py-3.5 sm:px-5 sm:py-4">
          <SettingColorGroup
            d={d}
            title="Цвет интерфейса"
            value={prefs.profileAccent}
            presets={PROFILE_ACCENT_PRESETS}
            normalize={normalizeProfileAccent}
            onChange={(hex) => setPrefs({ ...prefs, profileAccent: hex })}
          />
        </div>
      </ProfileCard>

      <ProfileCard d={d} title="Детали" description="Курсор видят все участники; обои — только ваш фон доски">
        <ProfileField d={d} label="Курсор" hint="Стиль указателя на канвасе" stacked>
          <RoomCursorPicker d={d} value={prefs.cursorStyle} onChange={(v) => setPrefs({ ...prefs, cursorStyle: v })} />
        </ProfileField>
        <div className={`border-t ${d.insetRow}`}>
          <ProfileField d={d} label="Обои" hint="Опционально — поверх цвета фона" stacked>
            <div className="space-y-4">
              <RoomWallpaperStudio
                d={d}
                wallpaperDataUrl={prefs.wallpaperDataUrl}
                hasFile={hasWallpaper}
                onPick={onWallpaperFile}
                onClear={onWallpaperClear}
              />
              <RoomWallpaperOpacity
                d={d}
                value={prefs.wallpaperOpacity}
                hasWallpaper={hasWallpaper}
                onChange={(wallpaperOpacity) => setPrefs({ ...prefs, wallpaperOpacity })}
              />
            </div>
          </ProfileField>
        </div>
      </ProfileCard>
    </div>
  );
}
