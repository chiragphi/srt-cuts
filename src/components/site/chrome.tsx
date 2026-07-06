"use client";

/**
 * Shared chrome for the customer app, Barbr client structure: dark header
 * bar, dark footer, star rows, avatar, and the sticky Book bar.
 */

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import { useAuth } from "@/context/auth";
import { useToast } from "@/components/site/Toast";

export function Wordmark({ style }: { style?: React.CSSProperties }) {
  return (
    <span className="cx-wordmark" style={style}>
      SRT <em>Cuts</em>
    </span>
  );
}

export function SiteHeader() {
  const { user, isAdmin, clearUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearUser();
      setConfirmLogout(false);
      router.push("/");
      toast("Signed out.", "success");
    } catch {
      toast("Sign out failed. Try again.", "error");
    }
  }

  return (
    <>
      <header className="cx-chrome">
        <div className="cx-shell cx-chrome-inner">
          <Link href="/" aria-label="SRT Cuts home">
            <Wordmark />
          </Link>
          <div className="flex items-center" style={{ gap: "clamp(14px, 2.6vw, 24px)" }}>
            {user ? (
              <>
                <Link href="/bookings" className="cx-chromelink">
                  My bookings
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="cx-chromelink">
                    Admin
                  </Link>
                )}
                <button className="cx-chromelink" onClick={() => setConfirmLogout(true)} style={{ background: "none", border: 0, cursor: "pointer" }}>
                  Log out
                </button>
              </>
            ) : (
              <Link href="/auth" className="cx-chromelink">
                Log in
              </Link>
            )}
            <Link href="/#services" className="cx-chromebtn">
              Book now
            </Link>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {confirmLogout && (
          <motion.div
            style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(20,17,25,0.5)", backdropFilter: "blur(3px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmLogout(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 460, borderTopLeftRadius: 22, borderTopRightRadius: 22, background: "var(--c-surface)", padding: 24, paddingBottom: "calc(24px + env(safe-area-inset-bottom))", boxShadow: "var(--c-shadow)" }}
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="cx-display cx-display--md">Sign out?</p>
              <p style={{ fontSize: 14, color: "var(--c-ink-2)", margin: "8px 0 20px" }}>
                You&apos;ll enter your phone number again to log back in.
              </p>
              <div className="grid grid-cols-2" style={{ gap: 12 }}>
                <button onClick={() => setConfirmLogout(false)} className="cx-btn cx-btn--ghost">Cancel</button>
                <button onClick={logout} className="cx-btn cx-btn--accent">Sign out</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function SiteFooter({ instagramUrl, tiktokUrl }: { instagramUrl?: string; tiktokUrl?: string }) {
  return (
    <footer className="cx-footer">
      <div className="cx-shell">
        <Wordmark style={{ fontSize: 27 }} />
        <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.55, color: "var(--c-on-dark-2)", maxWidth: 320 }}>
          Precision barbering in Herriman, Utah. One chair, by appointment, everything to prove.
        </p>
        <nav className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: "10px 40px", marginTop: 28, fontSize: 14.5, maxWidth: 560 }}>
          <Link href="/">Home</Link>
          <Link href="/#services">Services</Link>
          <Link href="/bookings">My bookings</Link>
          {instagramUrl ? (
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a>
          ) : tiktokUrl ? (
            <a href={tiktokUrl} target="_blank" rel="noopener noreferrer">TikTok</a>
          ) : (
            <Link href="/auth">Log in</Link>
          )}
        </nav>
        <p style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--c-on-dark-line)", fontSize: 12.5, color: "var(--c-on-dark-2)" }}>
          © {new Date().getFullYear()} SRT Cuts · Herriman, UT
        </p>
      </div>
    </footer>
  );
}

/* lucide-react no longer ships brand icons — inline SVGs instead. */
export function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.9 2.9 0 0 1-5.2 1.74 2.9 2.9 0 0 1 2.31-4.64c.3 0 .58.04.86.13V9.4a6.33 6.33 0 0 0-.86-.05A6.34 6.34 0 0 0 5 22.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.45a4.85 4.85 0 0 1-1.04-.05z" />
    </svg>
  );
}

export function Stars({ count = 5, size = 15 }: { count?: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }} aria-label={`${count} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          size={size}
          className={i < count ? "cx-star" : "cx-star cx-star--empty"}
          fill="currentColor"
          strokeWidth={0}
        />
      ))}
    </span>
  );
}

export function Avatar({ src, alt, size = 44 }: { src: string; alt: string; size?: number }) {
  return (
    <span className="cx-avatar" style={{ width: size, height: size, display: "inline-block" }}>
      <Image src={src} alt={alt} fill sizes={`${size}px`} style={{ objectFit: "cover" }} unoptimized />
    </span>
  );
}

export function StickyBookBar({
  show,
  avatarSrc,
  name,
  detail,
  cta,
  onBook,
  disabled,
}: {
  show: boolean;
  avatarSrc: string;
  name: string;
  detail: string;
  cta: string;
  onBook: () => void;
  disabled?: boolean;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="cx-stickybar"
          initial={{ y: 90 }}
          animate={{ y: 0 }}
          exit={{ y: 90 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="cx-stickybar-inner">
            <Avatar src={avatarSrc} alt={name} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</p>
              <p style={{ fontSize: 13, color: "var(--c-ink-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{detail}</p>
            </div>
            <button className="cx-btn cx-btn--accent" style={{ minWidth: 110 }} onClick={onBook} disabled={disabled}>
              {cta}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function FullSpinner() {
  return (
    <div className="site" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="cx-spin" style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid var(--c-line-2)", borderTopColor: "var(--c-accent)" }} />
    </div>
  );
}
