import type { Metadata, Viewport } from "next";
import { Anton, Instrument_Sans, Space_Mono } from "next/font/google";
import "./globals.css";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-anton",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-mono-space",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://srtcuts.hair"),
  title: "SRT Cuts",
  description: "SRT Cuts is between builds. Check back soon.",
  openGraph: {
    title: "SRT Cuts — Big things coming",
    description: "SRT Cuts is between builds. Check back soon.",
    siteName: "SRT Cuts",
    type: "website",
    images: [{ url: "/srt-logo.png", width: 512, height: 512, alt: "SRT Cuts" }],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#07040c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${instrument.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
