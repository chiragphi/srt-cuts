import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  metadataBase: new URL("https://srtcuts.hair"),
  title: {
    default: "SRT Cuts — Herriman, Utah Barber",
    template: "%s · SRT Cuts",
  },
  description:
    "Precision fades, clean lineups, and effortless online booking in Herriman, Utah. Book your appointment with SRT Cuts today.",
  keywords: ["Herriman barber", "SRT Cuts", "fade", "lineup", "haircut", "Utah barber", "Herriman Utah"],
  openGraph: {
    title: "SRT Cuts — Herriman, Utah Barber",
    description: "Precision fades, clean lineups, and online booking in Herriman, Utah.",
    siteName: "SRT Cuts",
    type: "website",
    images: [{ url: "/srt-logo.png", width: 512, height: 512, alt: "SRT Cuts logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SRT Cuts",
    description: "Precision barbering in Herriman, Utah.",
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
  themeColor: "#7657ff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#fbfaff] text-[#17151f]">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
