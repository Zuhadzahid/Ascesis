import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ascesis — Monk Mode, on one calm canvas",
  description:
    "A personal operating system for Monk Mode. Set your non-negotiables, run a 30, 60 or 90 day arc, and see your whole week on one canvas.",
};

export const viewport: Viewport = {
  themeColor: "#f1f3e0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

/**
 * Apply the saved typeface and theme before first paint.
 *
 * Without this the page renders in the default beige and then snaps to the
 * user's theme a moment later — a white flash on every navigation for anyone
 * running Graphite, which is exactly the audience least willing to tolerate
 * it. Writing both attributes onto <html> ahead of hydration is why the
 * element suppresses hydration warnings.
 *
 * The theme id is validated against the known list rather than trusted, since
 * localStorage is user-writable and may hold a theme removed in a later
 * release. Keep the list in step with THEMES in src/features/theme/themes.ts;
 * themes.test.ts checks that it is.
 */
const APPEARANCE_BOOTSTRAP = `try{var d=document.documentElement,s=localStorage;
var f=s.getItem('ascesis:font');d.dataset.font=['handwritten','clean','serif','mono'].indexOf(f)>-1?f:'handwritten';
var t=s.getItem('ascesis:theme');d.dataset.theme=['ascesis','graphite','parchment','harbor'].indexOf(t)>-1?t:'ascesis';
}catch(e){document.documentElement.dataset.font='handwritten';document.documentElement.dataset.theme='ascesis'}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`h-full ${fontVariables}`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Script id="appearance-bootstrap" strategy="beforeInteractive">
          {APPEARANCE_BOOTSTRAP}
        </Script>
        {children}
      </body>
    </html>
  );
}
