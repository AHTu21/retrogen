import type { CSSProperties } from "react";
import type { UserProfilePrefs } from "../../../lib/profilePrefs";
import type { ProfileDesign } from "../profileDesign";
import { NotepadCompactStats, NotepadQuickLinks, NotepadWorkspace } from "../profileNotepadUi";
import { ProfileSectionFrame } from "../profileUi";

type Props = {
  d: ProfileDesign;
  prefs: UserProfilePrefs;
  setPrefs: React.Dispatch<React.SetStateAction<UserProfilePrefs>>;
  themeStyle: CSSProperties;
};

export function ProfileNotepadPanel({ d, prefs, setPrefs, themeStyle }: Props) {
  return (
    <ProfileSectionFrame d={d} sectionId="notepad" compact>
      <div className="flex min-w-0 flex-col gap-3">
        <NotepadCompactStats d={d} text={prefs.notepad} />
        <NotepadWorkspace
          d={d}
          value={prefs.notepad}
          onChange={(notepad) => setPrefs({ ...prefs, notepad })}
          themeStyle={themeStyle}
        />
        <NotepadQuickLinks d={d} />
      </div>
    </ProfileSectionFrame>
  );
}
