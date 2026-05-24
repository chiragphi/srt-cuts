"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { CalendarDays, Home, LogOut, Scissors, UserRound } from "lucide-react";

export default function Navigation() {
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
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
    setAccountOpen(false);
    router.push("/");
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-black/[0.06] bg-white/72 pt-[env(safe-area-inset-top)] backdrop-blur-2xl">
        <div className="app-shell flex items-center justify-between h-16">
          <Link href="/" onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5">
            <Image
              src="/srt-logo.png"
              alt="SRT"
              width={30}
              height={30}
              className="object-contain"
            />
            <span className="text-sm font-semibold tracking-wider text-[#17151f] uppercase hidden min-[360px]:inline">
              SRT Cuts
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/#services"
              onClick={() => setAccountOpen(false)}
              className="hidden sm:inline text-sm font-medium text-[#6f6a7c] hover:text-[#17151f] transition-colors"
            >
              Services
            </Link>

            {user ? (
              <>
                <span className="desktop-only">
                  <Link
                    href="/book"
                    onClick={() => setAccountOpen(false)}
                    className="btn-primary min-h-0 py-2.5 px-4 text-sm"
                  >
                    Book
                  </Link>
                </span>
                <div className="relative hidden sm:block">
                  <button
                    type="button"
                    aria-expanded={accountOpen}
                    onClick={() => setAccountOpen((open) => !open)}
                    className="min-h-10 rounded-full px-4 text-sm font-semibold text-[#5d566e] hover:text-[#17151f] transition-colors bg-white/70 border border-black/10"
                  >
                    {user.name.split(" ")[0]}
                  </button>
                  <div
                    className={`absolute right-0 top-full mt-2 w-40 glass rounded-lg py-1 transition-opacity ${
                      accountOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#6f6a7c] hover:text-[#17151f] transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <span className="desktop-only">
                <Link href="/auth" onClick={() => setAccountOpen(false)} className="btn-primary min-h-0 py-2.5 px-4 text-sm">
                  Sign in
                </Link>
              </span>
            )}
            {user ? (
              <button
                onClick={logout}
                aria-label="Sign out"
                className="mobile-only min-h-10 w-10 rounded-full border border-black/10 bg-white/70 text-[#5d566e]"
              >
                <LogOut size={17} className="mx-auto" />
              </button>
            ) : (
              <Link
                href="/auth"
                aria-label="Sign in"
                className="mobile-only min-h-10 w-10 rounded-full border border-black/10 bg-white/70 text-[#5d566e] inline-flex items-center justify-center"
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
