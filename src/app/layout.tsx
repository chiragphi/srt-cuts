import type { Metadata, Viewport } from "next";
import { Anton, Instrument_Sans, Space_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth";
import { ToastProvider } from "@/components/Toast";

// Display: condensed poster weight — the loud, confident "something to prove"
// voice. Used uppercase, with restraint, at scale.
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-anton",
});

// Body & UI: a clean, current humanist grotesk.
const instrument = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument",
});

// Functional: monospace for the spec-sheet treatment — prices, times,
// indices, labels. The precision signal.
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-mono-space",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://srtcuts.hair"),
  title: {
    default: "SRT Cuts — Precision barber, Herriman UT",
    template: "%s · SRT Cuts",
  },
  description:
    "One chair, by appointment, everything to prove. Precision fades and lineups in Herriman, Utah — young hands, relentless standard. Reserve the chair.",
  keywords: ["Herriman barber", "SRT Cuts", "fade", "lineup", "haircut", "Utah barber", "Herriman Utah"],
  openGraph: {
    title: "SRT Cuts — Precision barber, Herriman UT",
    description: "One chair, by appointment, everything to prove. Precision fades and lineups in Herriman, Utah.",
    siteName: "SRT Cuts",
    type: "website",
    images: [{ url: "/srt-logo.png", width: 512, height: 512, alt: "SRT Cuts" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SRT Cuts",
    description: "Precision barbering in Herriman, Utah. One chair, by appointment.",
    images: ["/srt-logo.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SRT Cuts",
  },
};

export const viewport: Viewport = {
  themeColor: "#eceae3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${instrument.variable} ${spaceMono.variable}`}>
      <head>
        {/* Mark JS-enabled before first paint so scroll-reveal can hide content
            without a flash, while no-JS users still see everything. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
