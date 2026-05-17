import { useEffect, useMemo, useState } from "react";

export type ThemeMode = "dark" | "light";
export type CornerMode = "rounded" | "sharp";

const THEME_STORAGE_KEY = "retrogen_theme_mode";
const CORNER_STORAGE_KEY = "retrogen_corner_mode";

function detectInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

function detectInitialCorners(): CornerMode {
  try {
    const saved = localStorage.getItem(CORNER_STORAGE_KEY);
    if (saved === "rounded" || saved === "sharp") return saved;
  } catch {
    /* ignore */
  }
  return "rounded";
}

export function useAppTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => detectInitialTheme());

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-light");
    root.classList.add(themeMode === "light" ? "theme-light" : "theme-dark");
    root.classList.toggle("dark", themeMode === "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      /* ignore */
    }
  }, [themeMode]);

  const toggleTheme = useMemo(
    () => () => setThemeMode((prev) => (prev === "dark" ? "light" : "dark")),
    [],
  );

  return { themeMode, toggleTheme };
}

export function useAppCorners() {
  const [cornerMode, setCornerMode] = useState<CornerMode>(() => detectInitialCorners());

  useEffect(() => {
    document.documentElement.classList.remove("corners-rounded", "corners-sharp");
    document.documentElement.classList.add(cornerMode === "rounded" ? "corners-rounded" : "corners-sharp");
    try {
      localStorage.setItem(CORNER_STORAGE_KEY, cornerMode);
    } catch {
      /* ignore */
    }
  }, [cornerMode]);

  const toggleCorners = useMemo(
    () => () => setCornerMode((prev) => (prev === "rounded" ? "sharp" : "rounded")),
    [],
  );

  return { cornerMode, toggleCorners };
}

