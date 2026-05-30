import type { ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import type { ProfileDesign } from "../pages/profile/profileDesign";
import { getSettingsSection } from "./settingsHubRegistry";
import { useSettingsHub } from "./SettingsHubProvider";
import type { SettingsSectionId } from "./settingsHubTypes";

/** Контентная колонка detail-pane (как в ProfilePage). */
export function SettingsHubPanel({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`settings-hub-scroll mx-auto w-full min-w-0 px-5 py-5 sm:px-6 sm:py-6 ${
        wide ? "max-w-[44rem]" : "max-w-[36rem]"
      }`}
    >
      {children}
    </div>
  );
}

export function SettingsHubSectionHeader({
  sectionId,
  d,
}: {
  sectionId: SettingsSectionId;
  d: ProfileDesign;
}) {
  const meta = getSettingsSection(sectionId);
  if (!meta) return null;
  return (
    <header className="mb-5 border-b border-[var(--ph-separator)] pb-4">
      <p className={d.eyebrow}>{meta.groupLabel}</p>
      <h2 className={`mt-1 ${d.pageTitle} text-[1.375rem] sm:text-[1.5rem]`}>{meta.label}</h2>
      <p className={`mt-1.5 max-w-lg text-[0.8125rem] leading-relaxed ${d.muted}`}>{meta.description}</p>
    </header>
  );
}

export function SettingsHubActions({ children }: { children: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-center gap-2">{children}</div>;
}

export function SettingsHubNotice({
  d,
  variant = "info",
  children,
}: {
  d: ProfileDesign;
  variant?: "info" | "banner";
  children: ReactNode;
}) {
  const cls = variant === "banner" ? d.noticeBanner : d.noticeInfo;
  return <div className={`mb-5 ${cls} ${d.rSm} px-4 py-3 text-[0.8125rem] leading-relaxed`}>{children}</div>;
}

export function SettingsHubFootnote({ d, children }: { d: ProfileDesign; children: ReactNode }) {
  return <p className={`mt-5 text-[0.75rem] leading-relaxed ${d.muted}`}>{children}</p>;
}

/** Ссылка с закрытием hub при переходе. */
export function SettingsHubLink({ to, className, children, onClick, ...rest }: LinkProps) {
  const { close } = useSettingsHub();
  return (
    <Link
      to={to}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        close();
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function SettingsHubSavePill({
  d,
  saveStatus,
}: {
  d: ProfileDesign;
  saveStatus: { kind: string; text: string } | null;
}) {
  if (!saveStatus) return null;
  let cls = d.savePill;
  if (saveStatus.kind === "saved") cls = d.savePillActive;
  else if (saveStatus.kind === "blocked" || saveStatus.kind === "dirty") cls = d.savePillWarn;
  else if (saveStatus.kind === "pending") cls = d.savePillActive;
  return (
    <span className={`${cls} !inline-flex shrink-0`} aria-live="polite">
      {saveStatus.text}
    </span>
  );
}

export function SettingsHubKbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md bg-[var(--ph-surface-elevated)] px-1.5 py-0.5 text-[0.6875rem] font-medium ring-1 ring-[var(--ph-border)]">
      {children}
    </kbd>
  );
}
