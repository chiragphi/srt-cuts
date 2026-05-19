"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function Navigation() {
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  }

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-40 transition-all duration-300 pt-[env(safe-area-inset-top)]"
      style={{
        background: scrolled ? "rgba(0,0,0,0.64)" : "linear-gradient(to bottom, rgba(0,0,0,0.72), transparent)",
        backdropFilter: scrolled ? "blur(18px) saturate(180%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(18px) saturate(180%)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
      }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="app-shell flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/srt-logo.png"
            alt="SRT"
            width={30}
            height={30}
            className="object-contain"
            style={{ filter: "drop-shadow(0 0 8px rgba(139,92,246,0.7))" }}
          />
          <span className="text-sm font-semibold tracking-wider text-white/90 uppercase hidden min-[360px]:inline">
            SRT Cuts
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/#services"
            className="hidden sm:inline text-sm text-white/55 hover:text-white/90 transition-colors"
          >
            Services
          </Link>

          {user ? (
            <>
              <Link
                href="/book"
                className="btn-primary min-h-0 py-2.5 px-4 text-sm rounded-full"
              >
                Book
              </Link>
              <div className="relative group">
                <button className="min-h-10 rounded-full px-3 text-sm text-white/60 hover:text-white/90 transition-colors bg-white/[0.04] border border-white/10">
                  {user.name.split(" ")[0]}
                </button>
                <div className="absolute right-0 top-full mt-2 w-40 glass rounded-xl py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <Link href="/auth" className="btn-primary min-h-0 py-2.5 px-4 text-sm rounded-full">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
