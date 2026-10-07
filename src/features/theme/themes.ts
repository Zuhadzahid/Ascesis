/**
 * Theme definitions.
 *
 * Switching theme is a pure CSS custom property swap: no React re-render, no
 * network call, nothing for the server to do. At a hundred thousand concurrent
 * users the cost of this feature is still zero.
 *
 * This module holds no React and touches no `document`, so the token table can
 * be unit tested and reused by the pre-paint bootstrap script.
 */

/** The semantic slots every theme must fill. */
export const THEME_TOKENS = [
  "bg", // canvas / page background
  "bgRaised", // a surface sitting above the background
  "bgSunken", // hover and pressed fills
  "card", // card surface
  "cardBorder",
  "fg", // primary text
  "fgSoft", // secondary text
  "fgFaint", // hints and metadata
  "accent", // the primary interactive colour
  "accentSoft", // selected-row and badge fills
  "accentSoftStrong", // a firmer accentSoft
  "accent600", // accent, one step darker
  "accentStrong", // borders, edges, emphasis
  "accentDeep", // the darkest brand shade
  "chrome", // header and footer background
  "chromeFg", // header and footer text
  "chromeBorder",
  "dot", // canvas grid dot
  "danger",
  "dangerSoft",
] as const;

export type ThemeToken = (typeof THEME_TOKENS)[number];

export interface Theme {
  id: string;
  label: string;
  hint: string;
  /** Whether this theme is dark, so UI that needs to know can ask. */
  dark: boolean;
  /** Colour for the browser chrome, used by the theme-color meta tag. */
  browserTheme: string;
  /** Three colours for the picker's preview chip. */
  swatch: readonly [string, string, string];
  tokens: Record<ThemeToken, string>;
}

export const THEMES = [
  {
    id: "ascesis",
    label: "Ascesis",
    hint: "Paper and olive",
    dark: false,
    browserTheme: "#f1f3e0",
    swatch: ["#f1f3e0", "#a1bc98", "#3c463a"],
    tokens: {
      bg: "#f1f3e0",
      bgRaised: "#f6f7ec",
      bgSunken: "#e9ecd7",
      card: "#fbfcf5",
      cardBorder: "#d8e0c2",
      fg: "#3c463a",
      fgSoft: "#5f6e5b",
      fgFaint: "#8a9585",
      accent: "#a1bc98",
      accentSoft: "#d2dcb6",
      accentSoftStrong: "#c6d2a3",
      accent600: "#8aa681",
      accentStrong: "#778873",
      accentDeep: "#3c463a",
      chrome: "#3c463a",
      chromeFg: "#f1f3e0",
      chromeBorder: "#2e362c",
      dot: "rgba(122, 141, 115, 0.28)",
      danger: "#b4553f",
      dangerSoft: "#e7c3ba",
    },
  },
  {
    id: "graphite",
    label: "Graphite",
    hint: "Dark, for night work",
    dark: true,
    browserTheme: "#17191b",
    swatch: ["#17191b", "#7f9a86", "#e8eae6"],
    tokens: {
      bg: "#17191b",
      bgRaised: "#1e2124",
      bgSunken: "#272c30",
      card: "#1f2326",
      cardBorder: "#363c42",
      fg: "#e8eae6",
      fgSoft: "#b6bcb8",
      fgFaint: "#848d8a",
      accent: "#7f9a86",
      accentSoft: "#2f3a33",
      accentSoftStrong: "#3b4840",
      accent600: "#6d8674",
      accentStrong: "#93ad99",
      accentDeep: "#0f1113",
      chrome: "#0f1113",
      chromeFg: "#e8eae6",
      chromeBorder: "#2a2f33",
      dot: "rgba(160, 180, 165, 0.2)",
      danger: "#d4705a",
      dangerSoft: "#4a2a23",
    },
  },
  {
    id: "parchment",
    label: "Parchment",
    hint: "Warm and easy on the eye",
    dark: false,
    browserTheme: "#f6efe2",
    swatch: ["#f6efe2", "#c08a5e", "#4a3c2d"],
    tokens: {
      bg: "#f6efe2",
      bgRaised: "#fbf6ec",
      bgSunken: "#ede3d1",
      card: "#fdfaf3",
      cardBorder: "#e0d2ba",
      fg: "#4a3c2d",
      fgSoft: "#6d5c48",
      fgFaint: "#998872",
      accent: "#c08a5e",
      accentSoft: "#eedfc7",
      accentSoftStrong: "#e4cfae",
      accent600: "#a5724a",
      accentStrong: "#8a6542",
      accentDeep: "#4a3c2d",
      chrome: "#4a3c2d",
      chromeFg: "#f6efe2",
      chromeBorder: "#392e22",
      dot: "rgba(138, 101, 66, 0.24)",
      danger: "#b4553f",
      dangerSoft: "#ecc9bd",
    },
  },
  {
    id: "harbor",
    label: "Harbor",
    hint: "Cool slate and blue",
    dark: false,
    browserTheme: "#eef1f5",
    swatch: ["#eef1f5", "#5b7fa6", "#2b3545"],
    tokens: {
      bg: "#eef1f5",
      bgRaised: "#f5f7fa",
      bgSunken: "#e0e6ee",
      card: "#fbfcfe",
      cardBorder: "#ccd6e2",
      fg: "#2b3545",
      fgSoft: "#4c5a6e",
      fgFaint: "#79879a",
      accent: "#5b7fa6",
      accentSoft: "#d6e2ef",
      accentSoftStrong: "#bed0e4",
      accent600: "#486a8e",
      accentStrong: "#3d5a79",
      accentDeep: "#2b3545",
      chrome: "#2b3545",
      chromeFg: "#eef1f5",
      chromeBorder: "#1f2733",
      dot: "rgba(91, 127, 166, 0.26)",
      danger: "#b4553f",
      dangerSoft: "#e7c3ba",
    },
  },
] as const satisfies readonly Theme[];

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "ascesis";

export const THEME_STORAGE_KEY = "ascesis:theme";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function themeById(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/**
 * Which Tailwind colour variables each semantic token drives.
 *
 * The app was written against the original palette names, so rather than
 * rewriting every `bg-beige-200` in the codebase, a theme redefines what those
 * names mean. Two legacy names collapse onto one slot — `--color-olive-700`
 * was always the same colour as `--color-ink-soft` — which is why this maps to
 * a list.
 *
 * These are set directly rather than aliased through an intermediate variable.
 * A custom property substitutes its `var()` references at the element where it
 * is declared, so an alias declared on `:root` would ignore a `data-theme` set
 * further down the tree — and the landing page pins itself to the default
 * theme by doing exactly that.
 */
export const TOKEN_CSS_VARS: Record<ThemeToken, readonly string[]> = {
  bg: ["--color-beige"],
  bgRaised: ["--color-beige-100"],
  bgSunken: ["--color-beige-200"],
  card: ["--color-card"],
  cardBorder: ["--color-card-border"],
  fg: ["--color-ink"],
  fgSoft: ["--color-ink-soft", "--color-olive-700"],
  fgFaint: ["--color-ink-faint"],
  accent: ["--color-teal"],
  accentSoft: ["--color-tea"],
  accentSoftStrong: ["--color-tea-300"],
  accent600: ["--color-teal-600"],
  accentStrong: ["--color-olive"],
  accentDeep: ["--color-olive-900"],
  chrome: ["--color-chrome"],
  chromeFg: ["--color-chrome-fg"],
  chromeBorder: ["--color-chrome-border"],
  dot: ["--color-dot"],
  danger: ["--color-danger"],
  dangerSoft: ["--color-danger-soft"],
};

/**
 * The `[data-theme="…"] { … }` blocks that live in globals.css.
 *
 * Every theme gets a block, including the default. The default's is not
 * redundant: it is what lets the landing page opt out of theming by setting
 * `data-theme="ascesis"` on its own wrapper while the app runs on something
 * else.
 *
 * `themes.test.ts` asserts globals.css contains exactly this output, so the
 * stylesheet and this table cannot drift apart.
 */
export function themeCss(): string {
  return THEMES.map((theme) => {
    const body = THEME_TOKENS.flatMap((token) =>
      TOKEN_CSS_VARS[token].map((name) => `  ${name}: ${theme.tokens[token]};`),
    ).join("\n");
    return `[data-theme="${theme.id}"] {\n${body}\n}`;
  }).join("\n\n");
}
