/** Единая дизайн-система страницы профиля Retrogen (System Settings / Apple HIG). */



export type ProfileDesign = {

  isLight: boolean;

  r: string;

  rSm: string;

  rFull: string;

  page: string;

  topBar: string;

  shell: string;

  rail: string;

  railWidth: string;

  railPad: string;

  railDivider: string;

  identityPane: string;
  identityCard: string;

  main: string;

  mainPad: string;

  card: string;

  cardInset: string;

  cardHeader: string;

  cardBody: string;

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

  navGroup: string;

  navActive: string;

  navIdle: string;

  navLocked: string;

  btnPrimary: string;

  btnSecondary: string;

  btnGhost: string;

  noticeInfo: string;

  noticeDanger: string;

  badgeLive: string;

  badgeDone: string;

  statTile: string;

  field: (extra?: string) => string;

};



export function createProfileDesign(isLight: boolean, isRounded: boolean): ProfileDesign {

  const r = isRounded ? "rounded-2xl" : "rounded-lg";

  const rSm = isRounded ? "rounded-xl" : "rounded-md";

  const rFull = isRounded ? "rounded-full" : "rounded-none";



  const text = "text-[var(--ph-text)]";

  const muted = "text-[var(--ph-muted)]";



  return {

    isLight,

    r,

    rSm,

    rFull,

    page: `min-h-screen antialiased ${text} bg-[var(--ph-page-bg)]`,

    topBar:

      "border-b border-[var(--ph-border)] bg-[var(--ph-sticky-bg)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[var(--ph-sticky-bg)]",

    shell: `overflow-hidden ${r} bg-[var(--ph-panel-bg)] [box-shadow:var(--ph-shadow)] ring-1 ring-[var(--ph-border)] max-lg:overflow-visible`,

    rail: "bg-[var(--ph-sidebar-bg)]",

    railWidth:
      "w-full shrink-0 lg:grid lg:w-[26.75rem] lg:grid-cols-[12.25rem_14.5rem] lg:grid-rows-1 lg:items-stretch",

    railPad: "px-2 pt-4 pb-3",

    railDivider: "border-[var(--ph-separator)]",

    identityPane: "flex h-full min-h-0 flex-col border-l border-[var(--ph-separator)] px-3 pb-4 pt-4",
    identityCard: `flex h-full min-h-0 flex-1 flex-col overflow-hidden ${rSm} bg-[var(--ph-surface-elevated)]/50`,

    main: "flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--ph-panel-bg)]",

    mainPad: "px-4 py-4 sm:px-6 lg:px-8 lg:py-6",

    card: `${rSm} bg-[var(--ph-surface)] ring-1 ring-[var(--ph-border)]`,

    cardInset: "first:rounded-t-[inherit] last:rounded-b-[inherit]",

    cardHeader: "px-5 pt-4 pb-1",

    cardBody: "px-0 pb-1",

    sectionTitle: "text-[1.25rem] font-semibold tracking-[-0.02em] text-[var(--ph-text)] sm:text-[1.375rem]",

    sectionHint: `mt-1 max-w-xl text-[0.8125rem] leading-relaxed ${muted}`,

    inset: isLight ? "bg-[var(--ph-notepad-bg)]" : "bg-[var(--ph-surface-elevated)]",

    divider: "divide-[var(--ph-separator)]",

    eyebrow: `text-[0.75rem] font-medium ${muted}`,

    h1: "text-[1.375rem] font-semibold tracking-[-0.02em] text-[var(--ph-text)]",

    h2: "text-[0.8125rem] font-semibold text-[var(--ph-text)]",

    muted,

    label: `text-[0.75rem] font-medium ${muted}`,

    link: "font-medium text-[var(--ph-link)] hover:opacity-80",

    input:

      "border-[var(--ph-input-border)] bg-[var(--ph-input-bg)] text-[var(--ph-text)] placeholder:text-[var(--ph-muted)]",

    navGroup: `px-3 pb-1 pt-4 text-[0.6875rem] font-semibold tracking-wide ${muted} first:pt-0`,

    navActive:
      "mx-1.5 bg-[var(--ph-nav-active-bg)] font-medium text-[var(--ph-nav-active-text)]",

    navIdle:
      "mx-1.5 font-normal text-[var(--ph-nav-idle)] hover:bg-[var(--ph-nav-hover)] hover:text-[var(--ph-text)]",

    navLocked: `font-normal ${muted} opacity-50`,

    btnPrimary: `inline-flex items-center justify-center px-3.5 py-1.5 text-[0.8125rem] font-medium text-white transition hover:opacity-95 active:scale-[0.98] ${rSm} bg-[var(--ph-btn-bg)]`,

    btnSecondary: `inline-flex items-center justify-center px-3.5 py-1.5 text-[0.8125rem] font-medium transition active:scale-[0.98] ${rSm} bg-[var(--ph-surface-elevated)] text-[var(--ph-text)] ring-1 ring-[var(--ph-border)] hover:bg-[var(--ph-nav-hover)]`,

    btnGhost: `text-[0.75rem] font-medium text-[var(--ph-link)] transition hover:opacity-75`,

    noticeInfo: isLight

      ? "bg-amber-500/10 text-amber-950 ring-1 ring-amber-500/20"

      : "bg-amber-500/10 text-amber-100 ring-1 ring-amber-500/25",

    noticeDanger: isLight

      ? "bg-red-500/8 text-red-950 ring-1 ring-red-500/20"

      : "bg-red-500/10 text-red-100 ring-1 ring-red-500/25",

    badgeLive: isLight

      ? "bg-emerald-500/12 text-emerald-800"

      : "bg-emerald-400/15 text-emerald-300",

    badgeDone: isLight ? "bg-black/5 text-[var(--ph-muted)]" : "bg-white/8 text-[var(--ph-muted)]",

    statTile: `${rSm} bg-[var(--ph-surface)] px-4 py-3 ring-1 ring-[var(--ph-border)]`,

    field: (extra = "") =>

      `w-full border px-3 py-2 text-[0.8125rem] outline-none transition focus:ring-2 focus:ring-[var(--ph-accent)]/30 ${rSm} ${extra} border-[var(--ph-input-border)] bg-[var(--ph-input-bg)] text-[var(--ph-text)] placeholder:text-[var(--ph-muted)]`,

  };

}


