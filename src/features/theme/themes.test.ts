import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  THEMES,
  THEME_TOKENS,
  TOKEN_CSS_VARS,
  isThemeId,
  themeById,
  themeCss,
} from "./themes";

const GLOBALS = join(process.cwd(), "src/app/globals.css");
const START = "/* --- GENERATED THEME TOKENS START --- */";
const END = "/* --- GENERATED THEME TOKENS END --- */";

function generatedBlockFromCss(): string {
  const css = readFileSync(GLOBALS, "utf8");
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start, "start marker missing from globals.css").toBeGreaterThan(-1);
  expect(end, "end marker missing from globals.css").toBeGreaterThan(start);
  return css.slice(start + START.length, end).trim();
}

describe("theme definitions", () => {
  it("gives every theme a value for every token", () => {
    for (const theme of THEMES) {
      for (const token of THEME_TOKENS) {
        const value = theme.tokens[token];
        expect(value, `${theme.id} is missing ${token}`).toBeTruthy();
      }
    }
  });

  it("maps every token to at least one CSS variable", () => {
    for (const token of THEME_TOKENS) {
      expect(
        TOKEN_CSS_VARS[token].length,
        `${token} maps to nothing`,
      ).toBeGreaterThan(0);
    }
  });

  it("does not point two tokens at the same CSS variable", () => {
    // Two tokens writing one variable would make the later one silently win,
    // so a theme could look correct here and be wrong in the browser.
    const seen = new Map<string, string>();
    for (const token of THEME_TOKENS) {
      for (const name of TOKEN_CSS_VARS[token]) {
        const previous = seen.get(name);
        expect(
          previous,
          `${name} is written by both ${previous} and ${token}`,
        ).toBeUndefined();
        seen.set(name, token);
      }
    }
  });

  it("uses unique theme ids", () => {
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes the default theme", () => {
    expect(THEMES.some((t) => t.id === DEFAULT_THEME)).toBe(true);
  });

  it("recognises its own ids and rejects anything else", () => {
    for (const theme of THEMES) expect(isThemeId(theme.id)).toBe(true);
    expect(isThemeId("nope")).toBe(false);
    expect(isThemeId(null)).toBe(false);
    expect(isThemeId(undefined)).toBe(false);
    expect(isThemeId(42)).toBe(false);
  });

  it("falls back to the first theme for an unknown id", () => {
    // themeById is typed, but the id can arrive from localStorage, which is
    // user-writable and may hold a theme that was removed in a later release.
    expect(themeById("gone" as never).id).toBe(THEMES[0].id);
  });

  it("uses a colour value, not a variable reference, for every token", () => {
    // Indirection through another custom property would break the nested
    // data-theme the landing page relies on; see the note in themes.ts.
    for (const theme of THEMES) {
      for (const token of THEME_TOKENS) {
        expect(theme.tokens[token], `${theme.id}.${token}`).not.toContain(
          "var(",
        );
      }
    }
  });
});

describe("globals.css", () => {
  it("matches the generated theme CSS exactly", () => {
    // If this fails, run the generator and paste its output between the
    // markers in globals.css. Do not hand-edit the block.
    expect(generatedBlockFromCss()).toBe(themeCss());
  });

  it("keeps the pre-paint bootstrap script in step with the theme list", () => {
    // The bootstrap script in the root layout has to inline the valid ids: it
    // runs before any module loads, so it cannot import them. If a theme is
    // added here and not there, that theme fails to survive a reload — the
    // kind of bug that only shows up on the second page load.
    const layout = readFileSync(
      join(process.cwd(), "src/app/layout.tsx"),
      "utf8",
    );
    const list = layout.match(/\[((?:'[a-z]+',?)+)\]\.indexOf\(t\)/);
    expect(
      list,
      "theme id list not found in the bootstrap script",
    ).not.toBeNull();
    const ids = list![1].split(",").map((s) => s.trim().replace(/'/g, ""));
    expect(ids.sort()).toEqual(THEMES.map((t) => t.id).sort());
  });

  it("declares each themed variable in @theme so Tailwind emits a utility", () => {
    const css = readFileSync(GLOBALS, "utf8");
    const themeBlock = css.slice(css.indexOf("@theme {"), css.indexOf(START));
    for (const name of Object.values(TOKEN_CSS_VARS).flat()) {
      expect(
        themeBlock,
        `${name} is themed but never declared in @theme`,
      ).toContain(`${name}:`);
    }
  });
});
