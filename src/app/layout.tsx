import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SRT Cuts — Herriman, Utah",
  description: "Premium barbershop in Herriman, Utah. Book your appointment today.",
  openGraph: {
    title: "SRT Cuts",
    description: "Premium barbershop in Herriman, Utah.",
    siteName: "SRT Cuts",
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
