"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isThemeId,
  themeById,
  type ThemeId,
} from "./themes";

/**
 * Writes the theme to the document.
 *
 * The attribute is the whole mechanism — every colour in the app is a CSS
 * variable scoped to `[data-theme]`, so this one line repaints everything. The
 * meta tag is updated alongside it so the browser's own chrome (the address
 * bar on mobile, the title bar of an installed PWA) matches.
 */
export function applyTheme(id: ThemeId): void {
  const root = document.documentElement;
  root.dataset.theme = id;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", themeById(id).browserTheme);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // Private mode, or storage disabled. The theme still applies for this
    // session; it just will not be remembered.
  }
}

/** The theme the document is currently showing. */
export function currentTheme(): ThemeId {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const attr = document.documentElement.dataset.theme;
  return isThemeId(attr) ? attr : DEFAULT_THEME;
}

/**
 * Read and set the active theme.
 *
 * The initial value is read from the DOM rather than from storage, because the
 * bootstrap script in the root layout has already applied the stored theme
 * before first paint. Reading the attribute keeps this hook in agreement with
 * what is on screen instead of racing it.
 */
export function useTheme(): [ThemeId, (id: ThemeId) => void] {
  const [theme, setThemeState] = useState<ThemeId>(currentTheme);

  // If the attribute is somehow absent — the bootstrap script blocked by a
  // strict CSP, for instance — write it so the DOM agrees with this hook. No
  // setState is needed: `currentTheme()` already resolved to the default, so
  // React's copy is correct and only the document is out of step.
  useEffect(() => {
    if (!isThemeId(document.documentElement.dataset.theme)) {
      applyTheme(DEFAULT_THEME);
    }
  }, []);

  // A second tab changing the theme should not leave this one disagreeing.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY || !isThemeId(e.newValue)) return;
      document.documentElement.dataset.theme = e.newValue;
      setThemeState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((id: ThemeId) => {
    applyTheme(id);
    setThemeState(id);
  }, []);

  return [theme, setTheme];
}
