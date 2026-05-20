"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { CalendarDays, Home, LogOut, Scissors, UserRound } from "lucide-react";

export default function Navigation() {
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-white/[0.08] bg-black/72 pt-[env(safe-area-inset-top)] backdrop-blur-2xl">
        <div className="app-shell flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/srt-logo.png"
              alt="SRT"
              width={30}
              height={30}
              className="object-contain"
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
                <span className="desktop-only">
                  <Link
                    href="/book"
                    className="btn-primary min-h-0 py-2.5 px-4 text-sm"
                  >
                    Book
                  </Link>
                </span>
                <div className="relative group hidden sm:block">
                  <button className="min-h-10 rounded-lg px-3 text-sm text-white/60 hover:text-white/90 transition-colors bg-white/[0.04] border border-white/10">
                    {user.name.split(" ")[0]}
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-40 glass rounded-lg py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
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
              <span className="desktop-only">
                <Link href="/auth" className="btn-primary min-h-0 py-2.5 px-4 text-sm">
                  Sign in
                </Link>
              </span>
            )}
            {user ? (
              <button
                onClick={logout}
                aria-label="Sign out"
                className="mobile-only min-h-10 w-10 rounded-lg border border-white/10 bg-white/[0.05] text-white/70"
              >
                <LogOut size={17} className="mx-auto" />
              </button>
            ) : (
              <Link
                href="/auth"
                aria-label="Sign in"
                className="mobile-only min-h-10 w-10 rounded-lg border border-white/10 bg-white/[0.05] text-white/80 inline-flex items-center justify-center"
              >
                <UserRound size={17} />
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="mobile-only mobile-bottom-nav">
        <div className="mobile-nav-grid">
          <Link href="/" className="mobile-nav-item" data-active={pathname === "/"}>
            <Home size={18} />
            <span>Home</span>
          </Link>
          <Link href="/#services" className="mobile-nav-item" data-active={false}>
            <Scissors size={18} />
            <span>Cuts</span>
          </Link>
          <Link href="/book" className="mobile-nav-item" data-active={pathname === "/book"}>
            <CalendarDays size={18} />
            <span>Book</span>
          </Link>
          <Link href={user ? "/book" : "/auth"} className="mobile-nav-item" data-active={pathname === "/auth"}>
            <UserRound size={18} />
            <span>{user ? user.name.split(" ")[0] : "Sign in"}</span>
          </Link>
        </div>
      </div>
    </>
  );
}
