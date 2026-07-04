"use client";

import type { ReactNode } from "react";
import { CountUp } from "./motion";
import { signedPct } from "./format";
import { initialsOf } from "@/lib/analytics";

// ── Section heading — quiet eyebrow + title, one idea per region ──────
export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="ax-eyebrow mb-2">{eyebrow}</p>}
        <h2 style={{ fontSize: "clamp(20px, 2.4vw, 27px)", fontWeight: 620, letterSpacing: "-0.02em" }}>
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────
export function Card({
  children,
  className = "",
  pad = true,
  variant = "solid",
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
  variant?: "solid" | "flat" | "quiet";
}) {
  const cls = variant === "flat" ? "ax-card ax-card--flat" : variant === "quiet" ? "ax-card ax-card--quiet" : "ax-card";
  return <div className={`${cls} ${className}`} style={pad ? { padding: "var(--a-pad)" } : undefined}>{children}</div>;
}

// ── Hero stat tile — a single primary number, optional delta + spark ──
export function StatTile({
  label,
  value,
  format,
  delta,
  sub,
  spark,
  emphasis = false,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  delta?: number | null;
  sub?: ReactNode;
  spark?: ReactNode;
  emphasis?: boolean;
}) {
  const d = delta !== undefined ? signedPct(delta) : null;
  const tone =
    d?.tone === "up" ? "var(--s-ok)" : d?.tone === "down" ? "var(--s-danger)" : "var(--a-text-3)";
  return (
    <div
      className="ax-card"
      style={{
        padding: "var(--a-pad)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: emphasis ? "var(--a-surface)" : "var(--a-surface)",
        borderColor: emphasis ? "var(--a-accent-line)" : "var(--a-line)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="ax-eyebrow">{label}</span>
        {d && (
          <span className="ax-num" style={{ fontSize: 12.5, fontWeight: 600, color: tone }}>
            {d.text}
          </span>
        )}
      </div>
      <div
        className="ax-num"
        style={{ fontSize: "clamp(30px, 4vw, 43px)", fontWeight: 640, color: "var(--a-text)", lineHeight: 1 }}
      >
        <CountUp value={value} format={format} />
      </div>
      {spark}
      {sub && <div style={{ fontSize: 13, color: "var(--a-text-3)" }}>{sub}</div>}
    </div>
  );
}

// ── Badge helpers ─────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: "pending" | "accepted" | "denied" | "cancelled" }) {
  const map = {
    pending: { cls: "ax-badge--warn", label: "Pending" },
    accepted: { cls: "ax-badge--ok", label: "Accepted" },
    denied: { cls: "ax-badge--danger", label: "Denied" },
    cancelled: { cls: "ax-badge--neutral", label: "Cancelled" },
  } as const;
  const c = map[status];
  return <span className={`ax-badge ${c.cls}`}>{c.label}</span>;
}

// ── Avatar (monogram) ─────────────────────────────────────────────────
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        background: "var(--a-accent-soft)",
        color: "var(--a-accent-quiet)",
        fontSize: size * 0.36,
        fontWeight: 600,
        letterSpacing: "-0.01em",
      }}
    >
      {initialsOf(name)}
    </span>
  );
}

// ── Empty state — designed, not apologized for ────────────────────────
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="ax-card ax-card--flat"
      style={{
        padding: "clamp(36px, 6vw, 64px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 14,
      }}
    >
      {icon && (
        <span
          style={{
            display: "inline-flex",
            width: 46,
            height: 46,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 14,
            background: "var(--a-surface-3)",
            color: "var(--a-text-3)",
          }}
        >
          {icon}
        </span>
      )}
      <div style={{ fontSize: 17, fontWeight: 600, color: "var(--a-text)" }}>{title}</div>
      {body && <p style={{ fontSize: 14, color: "var(--a-text-3)", maxWidth: 340, lineHeight: 1.55 }}>{body}</p>}
      {action}
    </div>
  );
}

// ── Loading spinner ───────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex justify-center py-24">
      <div
        className="ax-spin"
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          border: "2px solid var(--a-line-strong)",
          borderTopColor: "var(--a-accent)",
        }}
      />
    </div>
  );
}

// ── Small labelled key/value ──────────────────────────────────────────
export function DataPoint({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="ax-eyebrow mb-1.5">{label}</div>
      <div className="ax-num" style={{ fontSize: 18, fontWeight: 600, color: "var(--a-text)" }}>
        {value}
      </div>
    </div>
  );
}
