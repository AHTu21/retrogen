import type { AuthUserDto } from "../../api";
import type { UserProfilePrefs } from "../../lib/profilePrefs";
import type { VisitedRoomEntry } from "../../lib/roomLobbyPrefs";
import type { ProfileDesign } from "./profileDesign";
import type { ProfileSectionId } from "./profileHubTheme";
import { ProfileRoomPanel } from "./ProfileRoomPanel";
import { ProfileDangerPanel } from "./panels/ProfileDangerPanel";
import { ProfileIdentityPanel } from "./panels/ProfileIdentityPanel";
import { ProfileLobbyPanel } from "./panels/ProfileLobbyPanel";
import { ProfileNotepadPanel } from "./panels/ProfileNotepadPanel";
import { ProfileOverviewPanel } from "./panels/ProfileOverviewPanel";
import { ProfileSecurityPanel } from "./panels/ProfileSecurityPanel";
import { ProfileSectionFrame } from "./profileUi";

export type ProfilePanelsProps = {
  d: ProfileDesign;
  section: ProfileSectionId;
  prefs: UserProfilePrefs;
  setPrefs: React.Dispatch<React.SetStateAction<UserProfilePrefs>>;
  authUser: AuthUserDto | null;
  visited: VisitedRoomEntry[];
  visitedCount: number;
  favoriteCount: number;
  onWallpaperFile: (f: File | undefined) => void;
  onLogout: () => void;
  onGoSection: (id: ProfileSectionId) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File | undefined) => void;
};

export function ProfileSectionPanels({
  d,
  section,
  prefs,
  setPrefs,
  authUser,
  visited,
  visitedCount,
  favoriteCount,
  onWallpaperFile,
  onLogout,
  onGoSection,
  onExportBackup,
  onImportBackup,
}: ProfilePanelsProps) {
  if (section === "overview") {
    return (
      <ProfileOverviewPanel
        d={d}
        prefs={prefs}
        authUser={authUser}
        visited={visited}
        visitedCount={visitedCount}
        favoriteCount={favoriteCount}
        onGoSection={onGoSection}
      />
    );
  }

  if (section === "identity") {
    return <ProfileIdentityPanel d={d} prefs={prefs} setPrefs={setPrefs} authUser={authUser} />;
  }

  if (section === "room") {
    return (
      <ProfileSectionFrame d={d} sectionId="room">
        <ProfileRoomPanel
          d={d}
          prefs={prefs}
          setPrefs={setPrefs}
          onWallpaperFile={onWallpaperFile}
          onWallpaperClear={() => setPrefs({ ...prefs, wallpaperDataUrl: null })}
        />
      </ProfileSectionFrame>
    );
  }

  if (section === "lobby") {
    return (
      <ProfileLobbyPanel d={d} visitedCount={visitedCount} favoriteCount={favoriteCount} />
    );
  }

  if (section === "notepad") {
    return <ProfileNotepadPanel d={d} prefs={prefs} setPrefs={setPrefs} />;
  }

  if (section === "security") {
    return (
      <ProfileSecurityPanel
        d={d}
        authUser={authUser}
        onLogout={onLogout}
        onExportBackup={onExportBackup}
        onImportBackup={onImportBackup}
      />
    );
  }

  if (section === "danger") {
    return <ProfileDangerPanel d={d} />;
  }

  return null;
}
