import type { UserProfilePrefs } from "../../lib/profilePrefs";
import { effectiveBoardWallpaper } from "../../lib/profilePrefs";
import { normalizeProfileAccent, PROFILE_ACCENT_PRESETS } from "../../lib/profileAccent";
import {
  BOARD_BACKDROP_PRESETS,
  HEADER_TINT_PRESETS,
  normalizeBoardBackdropColor,
  normalizeHeaderTintColor,
} from "../../lib/profileRoomColors";
import type { ProfileDesign } from "./profileDesign";
import {
  RoomCursorField,
  RoomPreviewStage,
  RoomWallpaperField,
  SettingColorGroup,
} from "./profileRoomUi";

type Props = {
  d: ProfileDesign;
  prefs: UserProfilePrefs;
  setPrefs: React.Dispatch<React.SetStateAction<UserProfilePrefs>>;
  onWallpaperFile: (f: File | undefined) => void;
  onWallpaperClear: () => void;
};

export function ProfileRoomPanel({ d, prefs, setPrefs, onWallpaperFile, onWallpaperClear }: Props) {
  const hasWallpaper = !!effectiveBoardWallpaper(prefs);

  return (
    <section
      className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden ${d.card}`}
      aria-label="Оформление доски ретро"
    >
      <div className="grid min-h-[min(26rem,calc(100dvh-12rem))] flex-1 lg:min-h-[min(32rem,calc(100dvh-10rem))] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="flex min-h-[14rem] min-w-0 flex-col border-b border-[var(--ph-separator)] lg:min-h-0 lg:border-b-0 lg:border-r">
          <RoomPreviewStage
            d={d}
            boardBackdrop={prefs.boardBackdrop}
            headerTint={prefs.headerTint}
            cursorStyle={prefs.cursorStyle}
            wallpaperDataUrl={prefs.wallpaperDataUrl}
            avatarDataUrl={prefs.avatarDataUrl}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto overscroll-contain p-4 sm:gap-3.5 sm:p-5 lg:max-h-none lg:p-6">
          <div className="mb-1 hidden lg:block">
            <p className="text-[0.8125rem] font-semibold text-[var(--ph-text)]">Оформление</p>
            <p className={`mt-0.5 text-[0.6875rem] ${d.muted}`}>Только в этом браузере</p>
          </div>

          <SettingColorGroup
            d={d}
            title="Акцент интерфейса"
            hint="Кнопки и выделения настроек"
            value={prefs.profileAccent}
            presets={PROFILE_ACCENT_PRESETS}
            normalize={normalizeProfileAccent}
            onChange={(hex) => setPrefs({ ...prefs, profileAccent: hex })}
          />
          <SettingColorGroup
            d={d}
            title="Фон доски"
            value={prefs.boardBackdrop}
            presets={BOARD_BACKDROP_PRESETS}
            normalize={normalizeBoardBackdropColor}
            onChange={(hex) => setPrefs({ ...prefs, boardBackdrop: hex })}
          />
          <SettingColorGroup
            d={d}
            title="Шапка комнаты"
            value={prefs.headerTint}
            presets={HEADER_TINT_PRESETS}
            normalize={normalizeHeaderTintColor}
            onChange={(hex) => setPrefs({ ...prefs, headerTint: hex })}
          />

          <RoomCursorField
            d={d}
            value={prefs.cursorStyle}
            onChange={(v) => setPrefs({ ...prefs, cursorStyle: v })}
          />
          <RoomWallpaperField d={d} hasFile={hasWallpaper} onPick={onWallpaperFile} onClear={onWallpaperClear} />
        </div>
      </div>
    </section>
  );
}
