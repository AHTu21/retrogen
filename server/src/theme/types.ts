export type WarmupOption = {
  id: string;
  label: string;
  hint?: string;
};

export type ThemeBlockCopy = {
  title: string;
  subtitle?: string;
  warmupOptions?: WarmupOption[];
  rateScale?: number;
};

export type ThemePack = {
  seedTheme: string;
  palette: {
    bg: string;
    surface: string;
    accent: string;
  };
  blocks: Record<string, ThemeBlockCopy>;
};

export const BLOCK_KINDS = [
  "warmup",
  "good",
  "bad",
  "improve",
  "sprintStar",
  "rateRetro",
  "oneThingNextRetro",
] as const;

export type BlockKind = (typeof BLOCK_KINDS)[number];
