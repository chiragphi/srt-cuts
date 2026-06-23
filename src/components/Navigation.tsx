"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { CalendarDays, House, LogOut, Scissors, User } from "lucide-react";
import { useAuth } from "@/context/auth";
import { useToast } from "@/components/Toast";

function Wordmark() {
  return (
    <span className="wordmark">
      SRT<span className="hot">.</span>CUTS
    </span>
  );
}

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
      toast("Signed out.", "success");
    } catch {
      toast("Sign out failed. Try again.", "error");
    }
  }

  return (
    <>
      <nav className="nav">
        <div className="shell flex h-16 items-center justify-between">
          <Link href="/" onClick={() => setAccountOpen(false)} aria-label="SRT Cuts home">
            <Wordmark />
          </Link>

          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/#work"
              className="hidden font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--mute)] transition-colors hover:text-[var(--ink)] sm:inline"
            >
              Work
            </Link>
            <Link
              href="/#services"
              className="hidden font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--mute)] transition-colors hover:text-[var(--ink)] sm:inline"
            >
              Services
            </Link>

            {user ? (
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  onClick={() => setAccountOpen((o) => !o)}
                  className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--ink)] transition-colors hover:text-[var(--accent-deep)]"
                >
                  {user.name.split(" ")[0]}
                </button>
                {accountOpen && (
                  <div className="menu" role="menu">
                    <Link href="/bookings" onClick={() => setAccountOpen(false)}>
                      <CalendarDays size={15} /> My bookings
                    </Link>
                    <div className="rule" />
                    {!confirmLogout ? (
                      <button onClick={() => setConfirmLogout(true)}>
                        <LogOut size={15} /> Sign out
                      </button>
                    ) : (
                      <div className="px-4 py-3">
                        <p className="mb-2 text-xs text-[var(--mute)]">Sign out?</p>
                        <div className="flex gap-3">
                          <button onClick={logout} className="!w-auto !p-0 text-xs font-bold text-[var(--accent-deep)]">
                            Yes
                          </button>
                          <button onClick={() => setConfirmLogout(false)} className="!w-auto !p-0 text-xs font-bold text-[var(--mute)]">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth"
                className="hidden font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--mute)] transition-colors hover:text-[var(--ink)] sm:inline"
              >
                Sign in
              </Link>
            )}

            <Link href="/book" className="btn btn--accent !min-h-[44px] !px-5 only-desk">
              Reserve
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile sign-out sheet */}
      {confirmLogout && (
        <div className="only-mobile fixed inset-0 z-[60] flex items-end bg-black/40" onClick={() => setConfirmLogout(false)}>
          <div
            className="w-full rounded-t-[14px] border-t border-[var(--line-strong)] bg-[var(--paper)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-2xl uppercase">Sign out?</p>
            <p className="mb-5 mt-1 text-sm text-[var(--mute)]">
              You&apos;ll enter your phone number again to log back in.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmLogout(false)} className="btn btn--ghost">
                Cancel
              </button>
              <button onClick={logout} className="btn btn--accent">
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <div className="tabbar only-mobile">
        <Link href="/" className="tab" data-active={pathname === "/"}>
          <House size={19} />
          <span>Home</span>
        </Link>
        <Link href="/#services" className="tab" data-active={false}>
          <Scissors size={19} />
          <span>Menu</span>
        </Link>
        <Link href="/book" className="tab" data-active={pathname === "/book"}>
          <CalendarDays size={19} />
          <span>Book</span>
        </Link>
        <Link
          href={user ? "/bookings" : "/auth"}
          className="tab"
          data-active={pathname === "/bookings" || pathname === "/auth"}
        >
          <User size={19} />
          <span>{user ? user.name.split(" ")[0] : "Sign in"}</span>
        </Link>
      </div>
    </>
  );
}
