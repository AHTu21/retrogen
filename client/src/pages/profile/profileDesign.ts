/**
 * Дизайн-система профиля Retrogen.
 * Паттерн: macOS System Settings / SAP Fiori list-detail — sidebar ~240px + detail pane.
 */

export type ProfileDesign = {
  isLight: boolean;
  r: string;
  rSm: string;
  rMd: string;
  rFull: string;
  page: string;
  topBar: string;
  window: string;
  sidebar: string;
  sidebarWidth: string;
  sidebarScroll: string;
  detail: string;
  detailInner: string;
  groupTitle: string;
  groupDesc: string;
  pageTitle: string;
  pageLead: string;
  insetGroup: string;
  insetRow: string;
  card: string;
  cardInset: string;
  sectionTitle: string;
  sectionHint: string;
  inset: string;
  divider: string;
  eyebrow: string;
  h1: string;
  h2: string;
  muted: string;
  label: string;
  link: string;
  input: string;
  navSection: string;
  navActive: string;
  navIdle: string;
  navDanger: string;
  navLocked: string;
  btnPrimary: string;
  btnSecondary: string;
  btnAction: string;
  btnGhost: string;
  noticeInfo: string;
  noticeDanger: string;
  noticeBanner: string;
  badgeLive: string;
  badgeDone: string;
  statTile: string;
  savePill: string;
  savePillActive: string;
  field: (extra?: string) => string;
};

export function createProfileDesign(isLight: boolean, isRounded: boolean): ProfileDesign {
  const r = isRounded ? "rounded-2xl" : "rounded-lg";
  const rSm = isRounded ? "rounded-xl" : "rounded-md";
  const rMd = isRounded ? "rounded-[0.875rem]" : "rounded-md";
  const rFull = isRounded ? "rounded-full" : "rounded-none";

  const muted = "text-[var(--ph-muted)]";

  return {
    isLight,
    r,
    rSm,
    rMd,
    rFull,

    page: "min-h-dvh antialiased text-[var(--ph-text)] bg-[var(--ph-page-bg)]",

    topBar:
      "border-b border-[var(--ph-border)] bg-[var(--ph-sticky-bg)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[var(--ph-sticky-bg)]",

    window: `flex min-w-0 max-w-full flex-col overflow-x-clip ${rMd} border border-[var(--ph-border)] bg-[var(--ph-panel-bg)] lg:flex-row lg:items-start`,

    sidebar:
      "flex w-full min-w-0 shrink-0 flex-col overflow-x-clip bg-[var(--ph-sidebar-bg)] lg:sticky lg:top-24 lg:w-[15.5rem] lg:max-w-[16.25rem] lg:self-start lg:border-r lg:border-[var(--ph-separator)] xl:w-[16.25rem]",

    sidebarWidth: "",

    sidebarScroll: "flex flex-col",

    detail: "flex min-w-0 flex-1 flex-col overflow-x-clip bg-[var(--ph-panel-bg)]",

    detailInner: "mx-auto w-full min-w-0 max-w-[42rem] overflow-x-clip px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7",

    groupTitle: "text-[0.8125rem] font-semibold tracking-[-0.01em] text-[var(--ph-text)]",

    groupDesc: `mt-0.5 text-[0.75rem] leading-relaxed ${muted}`,

    pageTitle: "text-[1.625rem] font-semibold tracking-[-0.03em] text-[var(--ph-text)] sm:text-[1.75rem]",

    pageLead: `mt-2 max-w-lg text-[0.9375rem] leading-relaxed ${muted}`,

    insetGroup: `${rSm} overflow-hidden bg-[var(--ph-surface)] ring-1 ring-[var(--ph-border)]`,

    insetRow: "border-[var(--ph-separator)]",

    card: `${rSm} overflow-hidden bg-[var(--ph-surface)] ring-1 ring-[var(--ph-border)]`,

    cardInset: "first:rounded-t-[inherit] last:rounded-b-[inherit]",

    sectionTitle: "text-[1.25rem] font-semibold tracking-[-0.02em] text-[var(--ph-text)] sm:text-[1.375rem]",

    sectionHint: `mt-1 max-w-xl text-[0.8125rem] leading-relaxed ${muted}`,

    inset: isLight ? "bg-[var(--ph-notepad-bg)]" : "bg-[var(--ph-surface-elevated)]",

    divider: "divide-[var(--ph-separator)]",

    eyebrow: `text-[0.6875rem] font-semibold uppercase tracking-[0.06em] ${muted}`,

    h1: "text-[1.375rem] font-semibold tracking-[-0.02em] text-[var(--ph-text)]",

    h2: "text-[0.8125rem] font-semibold text-[var(--ph-text)]",

    muted,
    label: `text-[0.75rem] font-medium ${muted}`,

    link: "font-medium text-[var(--ph-link)] transition hover:opacity-80",

    input:
      "border-[var(--ph-input-border)] bg-[var(--ph-input-bg)] text-[var(--ph-text)] placeholder:text-[var(--ph-muted)]",

    navSection: `px-3 pb-1 pt-5 text-[0.6875rem] font-semibold tracking-wide ${muted} first:pt-3`,

    navActive:
      "flex w-full items-center gap-2.5 rounded-lg bg-[var(--ph-nav-active-bg)] px-2.5 py-2 text-left text-[0.8125rem] font-medium text-[var(--ph-nav-active-text)] transition",

    navIdle:
      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.8125rem] font-normal text-[var(--ph-nav-idle)] transition hover:bg-[var(--ph-nav-hover)] hover:text-[var(--ph-text)]",

    navDanger:
      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.8125rem] font-normal text-red-600 transition hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/15",

    navLocked: `flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.8125rem] font-normal ${muted} opacity-45`,

    btnPrimary: `inline-flex h-9 min-h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-4 text-[0.8125rem] font-medium leading-none text-white transition hover:opacity-95 active:scale-[0.98] ${rSm} bg-[var(--ph-btn-bg)]`,

    btnSecondary: `inline-flex h-9 min-h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-4 text-[0.8125rem] font-medium leading-none transition active:scale-[0.98] ${rSm} bg-[var(--ph-surface-elevated)] text-[var(--ph-text)] ring-1 ring-[var(--ph-border)] hover:bg-[var(--ph-nav-hover)]`,

    /** Фиксированная ширина для пар кнопок в строках настроек (Опасная зона и т.п.) */
    btnAction: `inline-flex h-9 min-h-9 w-[9.5rem] shrink-0 items-center justify-center whitespace-nowrap px-4 text-[0.8125rem] font-medium leading-none transition active:scale-[0.98] ${rSm} bg-[var(--ph-surface-elevated)] text-[var(--ph-text)] ring-1 ring-[var(--ph-border)] hover:bg-[var(--ph-nav-hover)]`,

    btnGhost: `inline-flex h-9 min-h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-4 text-[0.8125rem] font-medium leading-none text-[var(--ph-link)] transition hover:bg-[var(--ph-nav-hover)] active:scale-[0.98] ${rSm}`,

    noticeInfo: isLight
      ? "bg-amber-500/10 text-amber-950 ring-1 ring-amber-500/20"
      : "bg-amber-500/10 text-amber-100 ring-1 ring-amber-500/25",

    noticeDanger: isLight
      ? "bg-red-500/8 text-red-950 ring-1 ring-red-500/20"
      : "bg-red-500/10 text-red-100 ring-1 ring-red-500/25",

    noticeBanner: isLight
      ? "border border-amber-500/25 bg-amber-500/8 text-amber-950"
      : "border border-amber-500/30 bg-amber-500/10 text-amber-100",

    badgeLive: isLight ? "bg-emerald-500/12 text-emerald-800" : "bg-emerald-400/15 text-emerald-300",

    badgeDone: isLight ? "bg-black/5 text-[var(--ph-muted)]" : "bg-white/8 text-[var(--ph-muted)]",

    statTile: `${rSm} bg-[var(--ph-surface)] px-4 py-3.5 ring-1 ring-[var(--ph-border)]`,

    savePill: `hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-medium sm:inline-flex ${muted} bg-[var(--ph-surface-elevated)] ring-1 ring-[var(--ph-border)]`,

    savePillActive: `hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-medium sm:inline-flex text-[var(--ph-accent)] bg-[var(--ph-nav-active-bg)]`,

    field: (extra = "") =>
      `w-full border px-3 py-2 text-[0.8125rem] outline-none transition focus:ring-2 focus:ring-[var(--ph-accent)]/30 ${rSm} ${extra} border-[var(--ph-input-border)] bg-[var(--ph-input-bg)] text-[var(--ph-text)] placeholder:text-[var(--ph-muted)]`,
  };
}
