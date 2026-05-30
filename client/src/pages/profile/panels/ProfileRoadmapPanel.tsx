import { Link } from "react-router-dom";
import type { ProfileDesign } from "../profileDesign";
import type { ProfileNavItem } from "../profileHubTheme";
import { ProfileSectionFrame } from "../profileUi";

type Props = {
  d: ProfileDesign;
  meta: ProfileNavItem;
};

/** Заглушка для locked-секций — вместо пустого экрана при deep-link или будущем релизе. */
export function ProfileRoadmapPanel({ d, meta }: Props) {
  return (
    <ProfileSectionFrame d={d} sectionId={meta.id}>
      <div className={`${d.insetGroup} p-5 sm:p-6`}>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--ph-accent)]">Скоро</p>
        <p className={`mt-3 max-w-lg text-[0.875rem] leading-relaxed ${d.muted}`}>
          Раздел появится в одном из следующих релизов Retrogen. Пока можно настроить профиль, комнату и блокнот в
          доступных разделах.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/profile#overview" className={d.btnSecondary}>
            К обзору
          </Link>
          <Link to="/messages" className={d.btnGhost}>
            Написать в поддержку →
          </Link>
        </div>
      </div>
    </ProfileSectionFrame>
  );
}
