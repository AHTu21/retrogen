export const PLANE_GRID_STEP = 16;

export function snapPlaneCoord(value: number, enabled: boolean): number {
  if (!enabled) return value;
  return Math.round(value / PLANE_GRID_STEP) * PLANE_GRID_STEP;
}

export const PLANE_SNAP_GRID_STORAGE_KEY = "retrogen_plane_snap_grid";

export function loadSnapToGridEnabled(): boolean {
  try {
    return localStorage.getItem(PLANE_SNAP_GRID_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveSnapToGridEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(PLANE_SNAP_GRID_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}
