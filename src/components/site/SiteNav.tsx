"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { CalendarDays, House, LogOut, Scissors, User, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/auth";
import { useToast } from "@/components/site/Toast";

function Wordmark() {
  return (
    <span className="cx-wordmark">
      SRT <em>Cuts</em>
    </span>
  );
}

export default function SiteNav() {
  const { user, isAdmin, clearUser } = useAuth();
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
      <nav className="cx-nav">
        <div className="cx-shell flex items-center justify-between" style={{ height: 68 }}>
          <Link href="/" onClick={() => setAccountOpen(false)} aria-label="SRT Cuts home">
            <Wordmark />
          </Link>

          <div className="flex items-center" style={{ gap: "clamp(14px, 2.4vw, 30px)" }}>
            <Link href="/#work" className="cx-navlink hidden md:inline">Work</Link>
            <Link href="/#services" className="cx-navlink hidden md:inline">Services</Link>
            <Link href="/#about" className="cx-navlink hidden md:inline">About</Link>

            {user ? (
              <div className="relative hidden md:block">
                <button
                  type="button"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  onClick={() => setAccountOpen((o) => !o)}
                  className="cx-navlink"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--c-ink)" }}
                >
                  {user.name.split(" ")[0]}
                  <ChevronDown size={15} />
                </button>
                {accountOpen && (
                  <div className="cx-menu" role="menu">
                    <Link href="/bookings" onClick={() => setAccountOpen(false)}>
                      <CalendarDays size={15} /> My bookings
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setAccountOpen(false)}>
                        <Scissors size={15} /> Admin
                      </Link>
                    )}
                    <div className="cx-hr" style={{ margin: "6px 4px" }} />
                    {!confirmLogout ? (
                      <button onClick={() => setConfirmLogout(true)}>
                        <LogOut size={15} /> Sign out
                      </button>
                    ) : (
                      <div style={{ padding: "8px 12px" }}>
                        <p style={{ fontSize: 13, color: "var(--c-ink-2)", marginBottom: 8 }}>Sign out?</p>
                        <div className="flex gap-4">
                          <button onClick={logout} style={{ padding: 0, width: "auto", fontSize: 13, fontWeight: 650, color: "var(--c-accent-ink)" }}>
                            Yes
                          </button>
                          <button onClick={() => setConfirmLogout(false)} style={{ padding: 0, width: "auto", fontSize: 13, fontWeight: 650, color: "var(--c-ink-3)" }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth" className="cx-navlink hidden md:inline">Sign in</Link>
            )}

            {user && (
              <button
                type="button"
                onClick={() => setConfirmLogout(true)}
                aria-label="Sign out"
                className="md:hidden"
                style={{
                  display: "inline-flex",
                  height: 40,
                  width: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  border: "1px solid var(--c-line-2)",
                  color: "var(--c-ink)",
                  background: "transparent",
                }}
              >
                <LogOut size={16} />
              </button>
            )}

            <Link href="/book" className="cx-btn cx-btn--accent cx-btn--sm">
              Reserve
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile sign-out sheet */}
      {confirmLogout && (
        <div
          className="md:hidden"
          style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "flex-end", background: "rgba(20,17,25,0.4)" }}
          onClick={() => setConfirmLogout(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              background: "var(--c-surface)",
              padding: 24,
              boxShadow: "var(--c-shadow)",
            }}
          >
            <p className="cx-display cx-display--md">Sign out?</p>
            <p style={{ fontSize: 14, color: "var(--c-ink-2)", margin: "8px 0 20px" }}>
              You&apos;ll enter your phone number again to log back in.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmLogout(false)} className="cx-btn cx-btn--ghost">Cancel</button>
              <button onClick={logout} className="cx-btn cx-btn--accent">Sign out</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile tab bar */}
      <div className="cx-tabbar">
        <Link href="/" className="cx-tab" data-active={pathname === "/"}>
          <House size={19} /> <span>Home</span>
        </Link>
        <Link href="/#services" className="cx-tab" data-active={false}>
          <Scissors size={19} /> <span>Menu</span>
        </Link>
        <Link href="/book" className="cx-tab" data-active={pathname === "/book"}>
          <CalendarDays size={19} /> <span>Book</span>
        </Link>
        <Link href="/#about" className="cx-tab" data-active={false}>
          <User size={19} /> <span>About</span>
        </Link>
        <Link
          href={user ? "/bookings" : "/auth"}
          className="cx-tab"
          data-active={pathname === "/bookings" || pathname === "/auth"}
        >
          <User size={19} /> <span>{user ? user.name.split(" ")[0] : "Sign in"}</span>
        </Link>
      </div>
    </>
  );
}
