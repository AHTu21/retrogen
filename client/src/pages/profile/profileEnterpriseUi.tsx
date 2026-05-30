import type { ReactNode } from "react";
import type { ProfileDesign } from "./profileDesign";

export type EnterpriseFeature = {
  id: string;
  icon: string;
  title: string;
  description: string;
  status: "available" | "soon" | "enterprise";
};

export type BillingTier = {
  id: string;
  name: string;
  price: string;
  description: string;
  highlights: string[];
  current?: boolean;
  badge?: string;
};

export function EnterprisePreviewHero({
  d,
  eyebrow,
  title,
  lead,
  icon,
}: {
  d: ProfileDesign;
  eyebrow: string;
  title: string;
  lead: string;
  icon: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${d.insetGroup} bg-gradient-to-br from-sky-500/10 via-[var(--ph-surface)] to-[var(--ph-surface-elevated)] p-5 sm:p-6 dark:from-sky-950/40`}
    >
      <div className="relative z-[1] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 max-w-xl">
          <p className={`text-[0.6875rem] font-semibold uppercase tracking-wide ${d.muted}`}>{eyebrow}</p>
          <h2 className="mt-1 text-[1.125rem] font-semibold tracking-[-0.02em] text-[var(--ph-text)] sm:text-[1.25rem]">
            {title}
          </h2>
          <p className={`mt-2 text-[0.8125rem] leading-relaxed ${d.muted}`}>{lead}</p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ring-1 ring-sky-500/25 ${
            d.isLight ? "bg-sky-50" : "bg-sky-950/50"
          }`}
          aria-hidden
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

export function EnterpriseFeatureGrid({ d, features }: { d: ProfileDesign; features: EnterpriseFeature[] }) {
  return (
    <section className="space-y-2">
      <div className="px-0.5">
        <h2 className={d.groupTitle}>Запланировано</h2>
        <p className={d.groupDesc}>Корпоративные функции — интерфейс готовится параллельно с backend</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.id} className={`flex min-w-0 gap-3 ${d.insetGroup} p-3.5 sm:p-4`}>
            <span className="text-lg leading-none" aria-hidden>
              {f.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[0.8125rem] font-semibold text-[var(--ph-text)]">{f.title}</p>
                <EnterpriseStatusBadge d={d} status={f.status} />
              </div>
              <p className={`mt-1 text-[0.75rem] leading-relaxed ${d.muted}`}>{f.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EnterpriseStatusBadge({
  d,
  status,
}: {
  d: ProfileDesign;
  status: EnterpriseFeature["status"];
}) {
  const label =
    status === "available" ? "Доступно" : status === "enterprise" ? "Корпоративный" : "Скоро";
  const cls =
    status === "available" ? d.badgeLive : status === "enterprise" ? d.badgePreview : d.badgeDone;
  return (
    <span className={`px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide ${d.rFull} ${cls}`}>
      {label}
    </span>
  );
}

export function BillingTierGrid({ d, tiers }: { d: ProfileDesign; tiers: BillingTier[] }) {
  return (
    <section className="space-y-2">
      <div className="px-0.5">
        <h2 className={d.groupTitle}>Тарифные планы</h2>
        <p className={d.groupDesc}>Сейчас все функции Retrogen доступны бесплатно для команд</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {tiers.map((tier) => (
          <article
            key={tier.id}
            className={`flex flex-col ${d.insetGroup} p-4 sm:p-5 ${
              tier.current ? "ring-2 ring-[var(--ph-accent)]/35" : ""
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[0.9375rem] font-semibold text-[var(--ph-text)]">{tier.name}</h3>
              {tier.current ? (
                <span className={`px-2 py-0.5 text-[0.625rem] font-semibold uppercase ${d.rFull} ${d.badgeLive}`}>
                  Текущий
                </span>
              ) : tier.badge ? (
                <span className={`px-2 py-0.5 text-[0.625rem] font-semibold uppercase ${d.rFull} ${d.badgeDone}`}>
                  {tier.badge}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-[1.25rem] font-semibold tracking-[-0.02em] text-[var(--ph-text)]">{tier.price}</p>
            <p className={`mt-1 text-[0.8125rem] leading-relaxed ${d.muted}`}>{tier.description}</p>
            <ul className={`mt-4 flex-1 space-y-1.5 text-[0.75rem] leading-relaxed ${d.muted}`}>
              {tier.highlights.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="shrink-0 text-[var(--ph-accent)]" aria-hidden>
                    ✓
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export function EnterpriseModuleStrip({ d, children }: { d: ProfileDesign; children: ReactNode }) {
  return (
    <div className={`${d.noticeInfo} px-4 py-3 text-[0.8125rem] leading-relaxed ${d.rSm}`}>{children}</div>
  );
}

export const ORG_ENTERPRISE_FEATURES: EnterpriseFeature[] = [
  {
    id: "sso",
    icon: "🔐",
    title: "SSO и корпоративный вход",
    description: "SAML/OIDC, провижининг пользователей и политики паролей.",
    status: "soon",
  },
  {
    id: "teams",
    icon: "👥",
    title: "Team+ и общие комнаты",
    description: "Организационное лобби, роли администратора и аудит доступа.",
    status: "soon",
  },
  {
    id: "white-label",
    icon: "🏢",
    title: "Свой бренд (white-label)",
    description: "Логотип, домен и палитра под заказчика — для крупных команд.",
    status: "enterprise",
  },
  {
    id: "admin",
    icon: "📊",
    title: "Консоль администратора",
    description: "Управление участниками, экспорт активности, политики хранения.",
    status: "soon",
  },
];

export const BILLING_TIERS: BillingTier[] = [
  {
    id: "free",
    name: "Бесплатный",
    price: "0 ₽",
    description: "Для небольших команд и пилотных ретро.",
    current: true,
    highlights: ["Неограниченные комнаты", "Профиль и блокнот", "Экспорт JSON", "Лобби и избранное"],
  },
  {
    id: "team",
    name: "Команда",
    price: "По запросу",
    description: "SSO, общее лобби организации и расширенная аналитика.",
    badge: "Скоро",
    highlights: ["Team+ лобби", "Email-уведомления с сервера", "Приоритетная поддержка", "GDPR-экспорт"],
  },
  {
    id: "enterprise",
    name: "Корпоративный",
    price: "По договору",
    description: "White-label, IAM, AI-модули и выделенный контур.",
    badge: "Корпоративный",
    highlights: ["Модули IAM · AI · ARCH", "On-prem / VPC", "SLA и выделенный CSM", "Кастомные интеграции"],
  },
];
