"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Search, X, UserRoundCheck } from "lucide-react";
import type { ClientSummary } from "@/lib/analytics";
import { formatPhone } from "@/lib/analytics";
import { Avatar } from "./primitives";

export function CustomerPicker({
  open,
  clients,
  busyPhone,
  onClose,
  onPick,
}: {
  open: boolean;
  clients: ClientSummary[];
  busyPhone: string | null;
  onClose: () => void;
  onPick: (phone: string) => void;
}) {
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = [...clients].sort((a, b) => (b.lastVisit?.getTime() ?? 0) - (a.lastVisit?.getTime() ?? 0));
    if (!needle) return list.slice(0, 40);
    return list
      .filter((c) => c.name.toLowerCase().includes(needle) || c.phone.includes(needle.replace(/\D/g, "")))
      .slice(0, 40);
  }, [clients, q]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-start justify-center"
          style={{ zIndex: "var(--z-modal)" as unknown as number, padding: "clamp(16px, 8vh, 96px) 16px" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <div
            aria-hidden
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)" }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="View as customer"
            className="ax-card"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 440,
              boxShadow: "var(--a-shadow-pop)",
              overflow: "hidden",
            }}
            initial={reduce ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
            animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between" style={{ padding: "18px 18px 0" }}>
              <div>
                <p className="ax-eyebrow">Impersonation</p>
                <h3 style={{ fontSize: 18, fontWeight: 620, marginTop: 2 }}>View as customer</h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="ax-btn ax-btn--sm"
                style={{ padding: 0, width: 34, height: 34, minHeight: 34 }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "14px 18px" }}>
              <div style={{ position: "relative" }}>
                <Search
                  size={16}
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--a-text-3)" }}
                />
                <input
                  autoFocus
                  className="ax-field"
                  style={{ paddingLeft: 36 }}
                  placeholder="Search by name or phone"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>

            <div style={{ maxHeight: "46vh", overflowY: "auto", padding: "0 10px 12px" }}>
              {filtered.length === 0 ? (
                <p style={{ textAlign: "center", padding: "28px 0", color: "var(--a-text-3)", fontSize: 14 }}>
                  No customers match.
                </p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.phone}
                    type="button"
                    onClick={() => onPick(c.phone)}
                    disabled={busyPhone === c.phone}
                    className="flex w-full items-center gap-3 text-left"
                    style={{
                      padding: "10px 10px",
                      borderRadius: "var(--a-r-sm)",
                      background: "transparent",
                      border: "1px solid transparent",
                      cursor: "pointer",
                      transition: "background 0.15s var(--a-ease-out)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--a-surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Avatar name={c.name} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate" style={{ fontSize: 14.5, fontWeight: 550 }}>
                        {c.name}
                      </div>
                      <div className="ax-num" style={{ fontSize: 12.5, color: "var(--a-text-3)" }}>
                        {formatPhone(c.phone)} · {c.visits} visit{c.visits === 1 ? "" : "s"}
                      </div>
                    </div>
                    {busyPhone === c.phone ? (
                      <span
                        className="ax-spin"
                        style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--a-line-strong)", borderTopColor: "var(--a-accent)" }}
                      />
                    ) : (
                      <UserRoundCheck size={16} style={{ color: "var(--a-text-3)" }} />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
