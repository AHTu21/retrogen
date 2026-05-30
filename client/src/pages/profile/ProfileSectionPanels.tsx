import type { CloudProfileMeta } from "../../lib/profileCloudPayload";
import type { CloudSyncState } from "../../lib/profileCloudSync";
import type { AuthUserDto } from "../../api";
import type { UserProfilePrefs } from "../../lib/profilePrefs";
import type { VisitedRoomEntry } from "../../lib/roomLobbyPrefs";
import type { CSSProperties } from "react";
import type { ProfileDesign } from "./profileDesign";
import type { ProfileSectionId } from "./profileHubTheme";
import { ProfileRoomPanel } from "./ProfileRoomPanel";
import { ProfileDangerPanel } from "./panels/ProfileDangerPanel";
import { ProfileBillingPanel } from "./panels/ProfileBillingPanel";
import { ProfileOrganizationPanel } from "./panels/ProfileOrganizationPanel";
import { ProfileIdentityPanel } from "./panels/ProfileIdentityPanel";
import { ProfileLobbyPanel } from "./panels/ProfileLobbyPanel";
import { ProfileNotificationsPanel } from "./panels/ProfileNotificationsPanel";
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
  lobbyRevision: number;
  onWallpaperFile: (f: File | undefined) => void;
  onLogout: () => void;
  onGoSection: (id: ProfileSectionId) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File | undefined) => void;
  cloudSyncLabel?: string | null;
  cloudSyncState?: CloudSyncState;
  cloudSyncMeta?: CloudProfileMeta;
  onRetryCloudSync?: () => void;
  avatarSrc?: string | null;
  wallpaperSrc?: string | null;
  themeStyle: CSSProperties;
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
  lobbyRevision,
  onWallpaperFile,
  onLogout,
  onGoSection,
  onExportBackup,
  onImportBackup,
  cloudSyncLabel,
  cloudSyncState,
  cloudSyncMeta,
  onRetryCloudSync,
  avatarSrc,
  wallpaperSrc,
  themeStyle,
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
    return (
      <ProfileIdentityPanel
        d={d}
        prefs={prefs}
        setPrefs={setPrefs}
        authUser={authUser}
        onGoSection={onGoSection}
        cloudSyncLabel={cloudSyncLabel}
        avatarSrc={avatarSrc}
      />
    );
  }

  if (section === "room") {
    return (
      <ProfileSectionFrame d={d} sectionId="room">
        <ProfileRoomPanel
          d={d}
          prefs={prefs}
          setPrefs={setPrefs}
          onWallpaperFile={onWallpaperFile}
          onWallpaperClear={() => setPrefs({ ...prefs, wallpaperDataUrl: null, wallpaperMediaPath: null })}
          wallpaperSrc={wallpaperSrc}
        />
      </ProfileSectionFrame>
    );
  }

  if (section === "lobby") {
    return (
      <ProfileLobbyPanel d={d} visitedCount={visitedCount} favoriteCount={favoriteCount} lobbyRevision={lobbyRevision} />
    );
  }

  if (section === "notepad") {
    return <ProfileNotepadPanel d={d} prefs={prefs} setPrefs={setPrefs} themeStyle={themeStyle} />;
  }

  if (section === "notifications") {
    return (
      <ProfileNotificationsPanel
        d={d}
        prefs={prefs}
        setPrefs={setPrefs}
        authUser={authUser}
        onGoSection={onGoSection}
      />
    );
  }

  if (section === "security") {
    return (
      <ProfileSecurityPanel
        d={d}
        authUser={authUser}
        onLogout={onLogout}
        onExportBackup={onExportBackup}
        onImportBackup={onImportBackup}
        cloudSyncLabel={cloudSyncLabel}
        cloudSyncState={cloudSyncState}
        cloudSyncMeta={cloudSyncMeta}
        onRetryCloudSync={onRetryCloudSync}
      />
    );
  }

  if (section === "danger") {
    return <ProfileDangerPanel d={d} onGoSection={onGoSection} />;
  }

  if (section === "organization") {
    return <ProfileOrganizationPanel d={d} authUser={authUser} onGoSection={onGoSection} />;
  }

  if (section === "billing") {
    return <ProfileBillingPanel d={d} onGoSection={onGoSection} />;
  }

  return null;
}
