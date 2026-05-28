import type { UserProfilePrefs } from "../../../lib/profilePrefs";
import type { ProfileDesign } from "../profileDesign";
import {
  NotepadHero,
  NotepadInsightStrip,
  NotepadResources,
  NotepadWorkspace,
} from "../profileNotepadUi";
import { ProfileSectionFrame } from "../profileUi";

type Props = {
  d: ProfileDesign;
  prefs: UserProfilePrefs;
  setPrefs: React.Dispatch<React.SetStateAction<UserProfilePrefs>>;
};

export function ProfileNotepadPanel({ d, prefs, setPrefs }: Props) {
  return (
    <ProfileSectionFrame d={d} sectionId="notepad">
      <div className="flex min-w-0 flex-col gap-8">
        <NotepadHero d={d} />
        <NotepadInsightStrip d={d} text={prefs.notepad} />
        <NotepadWorkspace
          d={d}
          value={prefs.notepad}
          onChange={(notepad) => setPrefs({ ...prefs, notepad })}
        />
        <NotepadResources d={d} />
      </div>
    </ProfileSectionFrame>
  );
}
