import type { ProfileDesign } from "../profileDesign";
import {
  DANGER_ACTIONS,
  DangerActionCard,
  DangerHero,
  DangerSupportStrip,
} from "../profileSecurityUi";
import { ProfileSectionFrame } from "../profileUi";

type Props = {
  d: ProfileDesign;
};

export function ProfileDangerPanel({ d }: Props) {
  return (
    <ProfileSectionFrame d={d} sectionId="danger">
      <div className="flex min-w-0 flex-col gap-8">
        <DangerHero d={d} />

        <div className={`${d.noticeDanger} px-4 py-3 text-[0.8125rem] leading-relaxed ${d.rSm}`}>
          Кнопки ниже пока отключены: функции подключаются для корпоративных клиентов после проверки личности.
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
