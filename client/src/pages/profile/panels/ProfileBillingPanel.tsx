import type { ProfileDesign } from "../profileDesign";
import type { ProfileSectionId } from "../profileHubTheme";
import {
  BILLING_TIERS,
  BillingTierGrid,
  EnterpriseModuleStrip,
  EnterprisePreviewHero,
} from "../profileEnterpriseUi";
import { ProfileSectionFrame } from "../profileUi";

type Props = {
  d: ProfileDesign;
  onGoSection: (id: ProfileSectionId) => void;
};

export function ProfileBillingPanel({ d, onGoSection }: Props) {
  return (
    <ProfileSectionFrame d={d} sectionId="billing">
      <div className="flex min-w-0 flex-col gap-8">
        <EnterprisePreviewHero
          d={d}
          eyebrow="Тариф"
          title="Планы и модули"
          lead="Сравнение тарифов и будущих модулей IAM, AI и ARCH. Оплата и апгрейд появятся здесь, без смены URL."
          icon="💳"
        />

        <BillingTierGrid d={d} tiers={BILLING_TIERS} />

        <EnterpriseModuleStrip d={d}>
          <p className="font-medium">Модули в разработке</p>
          <p className="mt-1 opacity-90">
            <strong className="font-semibold">IAM</strong> — роли и политики доступа;{" "}
            <strong className="font-semibold">AI</strong> — помощник фасилитатора;{" "}
            <strong className="font-semibold">ARCH</strong> — архив и compliance. Пока все базовые функции
            Retrogen бесплатны. Организация и SSO — в разделе{" "}
            <button type="button" className={d.link} onClick={() => onGoSection("organization")}>
              Организация
            </button>
            ; GDPR-экспорт — в{" "}
            <button type="button" className={d.link} onClick={() => onGoSection("danger")}>
              опасной зоне
            </button>
            .
          </p>
        </EnterpriseModuleStrip>
      </div>
    </ProfileSectionFrame>
  );
}
