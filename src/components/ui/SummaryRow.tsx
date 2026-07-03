// src/components/ui/SummaryRow.tsx
import { type ReactNode } from "react";

export function SummaryRow({ label, value, last }: { label: string; value: ReactNode; last?: boolean }) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-2.5"
      style={last ? undefined : { borderBottom: "1px solid var(--line)" }}
    >
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--mute)]">{label}</span>
      <span className="spec text-right text-sm">{value}</span>
    </div>
  );
}
