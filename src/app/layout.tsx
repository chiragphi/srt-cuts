import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://srtcuts.hair"),
  title: {
    default: "SRT Cuts — Herriman, Utah Barber",
    template: "%s · SRT Cuts",
  },
  description: "Premium barbershop in Herriman, Utah. Book your appointment today.",
  keywords: ["Herriman barber", "SRT Cuts", "fade", "lineup", "haircut", "Utah barber"],
  openGraph: {
    title: "SRT Cuts — Herriman, Utah Barber",
    description: "Precision fades, clean lineups, and online booking in Herriman, Utah.",
    siteName: "SRT Cuts",
    type: "website",
    images: ["/srt-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "SRT Cuts",
    description: "Precision barbering in Herriman, Utah.",
    images: ["/srt-logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-black text-white">{children}</body>
    </html>
  );
}
