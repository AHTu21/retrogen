import type { AuthUserDto } from "../../../api";
import { authRoleLabel } from "../profileSecurityUi";
import type { ProfileDesign } from "../profileDesign";
import type { ProfileSectionId } from "../profileHubTheme";
import {
  EnterpriseFeatureGrid,
  EnterpriseModuleStrip,
  EnterprisePreviewHero,
  ORG_ENTERPRISE_FEATURES,
} from "../profileEnterpriseUi";
import { ProfileCard, ProfileSectionFrame, ProfileValueRow } from "../profileUi";

type Props = {
  d: ProfileDesign;
  authUser: AuthUserDto | null;
  onGoSection: (id: ProfileSectionId) => void;
};

export function ProfileOrganizationPanel({ d, authUser, onGoSection }: Props) {
  const role = authUser ? authRoleLabel(authUser.globalRole) : null;

  return (
    <ProfileSectionFrame d={d} sectionId="organization">
      <div className="flex min-w-0 flex-col gap-8">
        <EnterprisePreviewHero
          d={d}
          eyebrow="Корпоратив"
          title="Организация"
          lead="Предпросмотр Team+ и корпоративных функций. Сейчас вы работаете как индивидуальный участник с локальным профилем."
          icon="🏢"
        />

        <ProfileCard d={d} title="Текущий статус">
          <ProfileValueRow
            d={d}
            label="Аккаунт"
            value={authUser?.email ?? "—"}
            hint={role ? `Роль: ${role}` : undefined}
          />
          <ProfileValueRow
            d={d}
            label="Организация"
            value="Не подключена"
            hint="При активации Team+ здесь появится название компании и домен SSO"
            divided
          />
        </ProfileCard>

        <EnterpriseFeatureGrid d={d} features={ORG_ENTERPRISE_FEATURES} />

        <EnterpriseModuleStrip d={d}>
          <p className="font-medium">Что можно настроить уже сейчас</p>
          <p className="mt-1 opacity-90">
            Профиль, уведомления и резервная копия JSON — в разделах{" "}
            <button type="button" className={d.link} onClick={() => onGoSection("identity")}>
              Личные данные
            </button>
            ,{" "}
            <button type="button" className={d.link} onClick={() => onGoSection("notifications")}>
              Уведомления
            </button>{" "}
            и{" "}
            <button type="button" className={d.link} onClick={() => onGoSection("security")}>
              Безопасность
            </button>
            . Тарифы — в разделе{" "}
            <button type="button" className={d.link} onClick={() => onGoSection("billing")}>
              Тариф
            </button>
            .
          </p>
        </EnterpriseModuleStrip>
      </div>
    </ProfileSectionFrame>
  );
}
