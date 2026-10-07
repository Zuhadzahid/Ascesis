import {
  Inter,
  JetBrains_Mono,
  Lora,
  Playpen_Sans,
} from "next/font/google";

/**
 * The four typefaces the user can pick between, in the spirit of tldraw's
 * font options. Playpen Sans is the default: a handwritten face that matches
 * the drawn-on-paper feel of the canvas.
 *
 * Each is exposed as a CSS variable; globals.css swaps `--font-sans` between
 * them based on the `data-font` attribute on <html>.
 */
export const playpenSans = Playpen_Sans({
  subsets: ["latin"],
  variable: "--font-playpen",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const fontVariables = [
  playpenSans.variable,
  inter.variable,
  lora.variable,
  jetbrainsMono.variable,
].join(" ");
