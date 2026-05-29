import type { AuthUserDto } from "../../../api";
import type { ProfileDesign } from "../profileDesign";
import {
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
};

export function ProfileSecurityPanel({ d, authUser, onLogout, onExportBackup, onImportBackup }: Props) {
  return (
    <ProfileSectionFrame d={d} sectionId="security">
      <div className="flex min-w-0 flex-col gap-8">
        <SecurityHero d={d} authUser={authUser} />
        <SecuritySessionCard d={d} authUser={authUser} onLogout={onLogout} />
        <SecurityDataPortability d={d} onExport={onExportBackup} onImport={onImportBackup} />
        <SecurityFeaturesGrid d={d} authUser={authUser} />
        <SecurityPrivacyNote d={d} />
      </div>
    </ProfileSectionFrame>
  );
}
