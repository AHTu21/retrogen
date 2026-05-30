import type { AuthUserDto } from "../../../api";
import type { CloudProfileMeta } from "../../../lib/profileCloudPayload";
import type { CloudSyncState } from "../../../lib/profileCloudSync";
import type { ProfileDesign } from "../profileDesign";
import {
  SecurityCloudSyncCard,
  SecurityDataPortability,
  SecurityFeaturesGrid,
  SecurityHero,
  SecurityPrivacyNote,
  SecuritySessionCard,
} from "../profileSecurityUi";
import { ProfileSectionFrame } from "../profileUi";

type Props = {
  d: ProfileDesign;
  authUser: AuthUserDto | null;
  onLogout: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File | undefined) => void;
  cloudSyncLabel?: string | null;
  cloudSyncState?: CloudSyncState;
  cloudSyncMeta?: CloudProfileMeta;
  onRetryCloudSync?: () => void;
};

export function ProfileSecurityPanel({
  d,
  authUser,
  onLogout,
  onExportBackup,
  onImportBackup,
  cloudSyncLabel,
  cloudSyncState,
  cloudSyncMeta,
  onRetryCloudSync,
}: Props) {
  return (
    <ProfileSectionFrame d={d} sectionId="security">
      <div className="flex min-w-0 flex-col gap-8">
        <SecurityHero d={d} authUser={authUser} />
        <SecuritySessionCard d={d} authUser={authUser} onLogout={onLogout} />
        <SecurityCloudSyncCard
          d={d}
          authUser={authUser}
          label={cloudSyncLabel}
          state={cloudSyncState}
          meta={cloudSyncMeta}
          onRetry={onRetryCloudSync}
        />
        <SecurityDataPortability d={d} onExport={onExportBackup} onImport={onImportBackup} />
        <SecurityFeaturesGrid d={d} authUser={authUser} />
        <SecurityPrivacyNote d={d} />
      </div>
    </ProfileSectionFrame>
  );
}
