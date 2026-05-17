import type { BoardGadgetDto } from "../types";

export type LayerZSources = {
  blockMeta: Record<string, { z: number }>;
  cardMeta: Record<string, { z: number }>;
  gadgets: BoardGadgetDto[];
  shapes: Array<{ layerZ?: number }>;
};

export function maxLayerZ(src: LayerZSources): number {
  const bz = Object.values(src.blockMeta).map((m) => m.z);
  const cz = Object.values(src.cardMeta).map((m) => m.z);
  const gz = src.gadgets.map((g) => g.layerZ ?? 0);
  const sz = src.shapes.map((s) => s.layerZ ?? 0);
  return Math.max(50, ...bz, ...cz, ...gz, ...sz);
}

export function minLayerZ(src: LayerZSources): number {
  const bz = Object.values(src.blockMeta).map((m) => m.z);
  const cz = Object.values(src.cardMeta).map((m) => m.z);
  const gz = src.gadgets.map((g) => g.layerZ ?? 0);
  const sz = src.shapes.map((s) => s.layerZ ?? 0);
  const all = [...bz, ...cz, ...gz, ...sz];
  if (all.length === 0) return 50;
  return Math.min(...all);
}
