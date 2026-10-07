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
 * Apply the saved typeface before first paint, so choosing a font does not
 * flash the default on every page load. This writes data-font onto <html>
 * ahead of hydration, which is why the element suppresses hydration warnings.
 */
const FONT_BOOTSTRAP = `try{var f=localStorage.getItem('ascesis:font');document.documentElement.dataset.font=f||'handwritten'}catch(e){}`;

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
        <Script id="font-bootstrap" strategy="beforeInteractive">
          {FONT_BOOTSTRAP}
        </Script>
        {children}
      </body>
    </html>
  );
}
