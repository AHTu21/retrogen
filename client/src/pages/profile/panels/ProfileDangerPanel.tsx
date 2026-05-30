import type { ProfileDesign } from "../profileDesign";
import type { ProfileSectionId } from "../profileHubTheme";
import {
  DANGER_ACTIONS,
  DangerActionCard,
  DangerHero,
  DangerSupportStrip,
} from "../profileSecurityUi";
import { ProfileSectionFrame } from "../profileUi";

type Props = {
  d: ProfileDesign;
  onGoSection: (id: ProfileSectionId) => void;
};

export function ProfileDangerPanel({ d, onGoSection }: Props) {
  return (
    <ProfileSectionFrame d={d} sectionId="danger">
      <div className="flex min-w-0 flex-col gap-8">
        <DangerHero d={d} />

        <div className={`${d.noticeInfo} px-4 py-3 text-[0.8125rem] leading-relaxed ${d.rSm}`}>
          Локальную копию настроек (JSON) можно скачать в разделе{" "}
          <button type="button" className={d.link} onClick={() => onGoSection("security")}>
            Безопасность → Резервная копия
          </button>
          . Ниже — корпоративные запросы GDPR и удаление аккаунта (пока недоступны).
        </div>

        <section className="space-y-3">
          <div className="px-0.5">
            <h2 className={d.groupTitle}>Данные и аккаунт</h2>
            <p className={d.groupDesc}>Необратимые операции — читайте последствия перед запросом</p>
          </div>
          {DANGER_ACTIONS.map((action) => (
            <DangerActionCard key={action.id} d={d} action={action} />
          ))}
        </section>

        <DangerSupportStrip d={d} />
      </div>
    </ProfileSectionFrame>
  );
}
