// src/components/ui/Pill.tsx
import { type ButtonHTMLAttributes, type ReactNode } from "react";

export function Pill({
  active,
  children,
  ...props
}: { active?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-full border px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.1em] transition-colors"
      style={{
        borderColor: active ? "transparent" : "var(--line-strong)",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#ffffff" : "var(--mute)",
      }}
    >
      {children}
    </button>
  );
}
