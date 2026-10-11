import type { Metadata, Viewport } from "next";
import { Cinzel, Inter, JetBrains_Mono } from "next/font/google";
import { AppHeader, AppFooter } from "@/components/shell";
import { NAV_SECTIONS } from "@/lib/navigation";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nooreign.vercel.app"),
  title: {
    default: "Nooreign — The philosophical atlas of aligning intelligence",
    template: "%s · Nooreign",
  },
  description:
    "Twelve kingdoms of ethical thought, twenty-eight advisors, twenty dilemmas about superintelligence, and a time machine that replays how we aligned — from Aristotle to frontier reasoning. Deterministic, offline, zero API keys.",
  keywords: [
    "ai alignment",
    "superintelligence",
    "ethics",
    "philosophy",
    "moral uncertainty",
    "constitutional ai",
    "scalable oversight",
    "asilomar",
    "philosophical atlas",
  ],
  authors: [{ name: "Aniruddha Adak" }],
  openGraph: {
    type: "website",
    url: "https://nooreign.vercel.app",
    title: "Nooreign — The philosophical atlas of aligning intelligence",
    description:
      "The ethics of human versus superintelligence, as a realm you can walk: kingdoms, advisor courts, dilemmas, and the whole history of how we tried to align.",
    siteName: "Nooreign",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nooreign — The philosophical atlas of aligning intelligence",
    description: "Kingdoms of moral thought. Courts that deliberate. A time machine for the history of alignment.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#070b18",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="starfield min-h-dvh antialiased">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <AppHeader sections={NAV_SECTIONS} />
        <main id="main" className="mx-auto w-full max-w-6xl px-5 pb-24 pt-28 sm:px-8">
          {children}
        </main>
        <AppFooter />
      </body>
    </html>
  );
}
