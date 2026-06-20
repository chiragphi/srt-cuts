"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { CalendarDays, ClockIcon, Home, LogOut, Scissors, UserRound } from "lucide-react";
import { useAuth } from "@/context/auth";
import { useToast } from "@/components/Toast";

export default function Navigation() {
  const { user, clearUser } = useAuth();
  const { toast } = useToast();
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearUser();
      setAccountOpen(false);
      setConfirmLogout(false);
      router.push("/");
      toast("Signed out successfully.", "success");
    } catch {
      toast("Sign out failed. Please try again.", "error");
    }
  }

  const isServices = pathname === "/" || pathname.startsWith("/#");

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-white/[0.08] bg-black/55 pt-[env(safe-area-inset-top)] backdrop-blur-2xl">
        <div className="app-shell flex items-center justify-between h-16">
          <Link href="/" onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5">
            <Image
              src="/srt-logo.png"
              alt="SRT Cuts"
              width={30}
              height={30}
              className="object-contain rounded-lg"
            />
            <span className="text-sm font-semibold tracking-[0.18em] uppercase hidden min-[360px]:inline text-[#f5f0e6]">
              SRT Cuts
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/#services"
              onClick={() => setAccountOpen(false)}
              className="hidden sm:inline text-sm font-medium transition-colors text-[#cfc8ba] hover:text-[#f5f0e6]"
            >
              Services
            </Link>

            {user ? (
              <>
                <span className="desktop-only">
                  <Link
                    href="/book"
                    onClick={() => setAccountOpen(false)}
                    className="btn-gold min-h-0 py-2.5 px-4 text-sm"
                  >
                    Book
                  </Link>
                </span>
                <div className="relative hidden sm:block">
                  <button
                    type="button"
                    aria-expanded={accountOpen}
                    aria-haspopup="menu"
                    onClick={() => setAccountOpen((open) => !open)}
                    className="min-h-10 rounded-full px-4 text-sm font-semibold transition-colors text-[#cfc8ba] hover:text-[#f5f0e6] bg-white/[0.05] border border-white/10"
                  >
                    {user.name.split(" ")[0]}
                  </button>
                  {accountOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 glass rounded-xl py-1 shadow-[0_20px_48px_rgba(0,0,0,0.5)]">
                      <Link
                        href="/bookings"
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-[#cfc8ba] hover:text-[#f5f0e6] transition-colors"
                      >
                        <ClockIcon size={14} />
                        My Bookings
                      </Link>
                      <div className="h-px bg-white/10 mx-2 my-1" />
                      {!confirmLogout ? (
                        <button
                          onClick={() => setConfirmLogout(true)}
                          className="w-full text-left px-4 py-2.5 text-sm text-[#cfc8ba] hover:text-[#f5f0e6] transition-colors"
                        >
                          Sign out
                        </button>
                      ) : (
                        <div className="px-4 py-2.5">
                          <p className="text-xs text-[#8c857a] mb-2">Sign out?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={logout}
                              className="flex-1 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmLogout(false)}
                              className="flex-1 text-xs font-semibold text-[#8c857a] hover:text-[#f5f0e6] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <span className="desktop-only">
                <Link
                  href="/auth"
                  onClick={() => setAccountOpen(false)}
                  className="btn-gold min-h-0 py-2.5 px-4 text-sm"
                >
                  Sign in
                </Link>
              </span>
            )}
            {user ? (
              <button
                onClick={() => { setConfirmLogout(true); setAccountOpen(false); }}
                aria-label="Sign out"
                className="mobile-only min-h-10 w-10 rounded-full inline-flex items-center justify-center border border-white/10 bg-white/[0.05] text-[#cfc8ba]"
              >
                <LogOut size={17} />
              </button>
            ) : (
              <Link
                href="/auth"
                aria-label="Sign in"
                className="mobile-only min-h-10 w-10 rounded-full inline-flex items-center justify-center border border-white/10 bg-white/[0.05] text-[#cfc8ba]"
              >
                <UserRound size={17} />
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile logout confirmation overlay */}
      {confirmLogout && (
        <div
          className="mobile-only fixed inset-0 z-50 flex items-end"
          onClick={() => setConfirmLogout(false)}
        >
          <div
            className="w-full app-card rounded-b-none p-6 shadow-[0_-20px_48px_rgba(0,0,0,0.55)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold text-[#f5f0e6] mb-1">Sign out?</p>
            <p className="text-sm text-[#8c857a] mb-5">You&apos;ll need to enter your phone number again to log back in.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmLogout(false)} className="btn-outline">Cancel</button>
              <button onClick={logout} className="btn-gold">Sign out</button>
            </div>
          </div>
        </div>
      )}

      <div className="mobile-only mobile-bottom-nav">
        <div className="mobile-nav-grid">
          <Link href="/" className="mobile-nav-item" data-active={pathname === "/"}>
            <Home size={18} />
            <span>Home</span>
          </Link>
          <Link href="/#services" className="mobile-nav-item" data-active={isServices && pathname === "/"}>
            <Scissors size={18} />
            <span>Cuts</span>
          </Link>
          <Link href="/book" className="mobile-nav-item" data-active={pathname === "/book"}>
            <CalendarDays size={18} />
            <span>Book</span>
          </Link>
          <Link
            href={user ? "/bookings" : "/auth"}
            className="mobile-nav-item"
            data-active={pathname === "/bookings" || pathname === "/auth"}
          >
            <UserRound size={18} />
            <span>{user ? user.name.split(" ")[0] : "Sign in"}</span>
          </Link>
        </div>
      </div>
    </>
  );
}
