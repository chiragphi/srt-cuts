// src/components/ui/StatList.tsx
import { type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

export function StatList({ children }: { children: ReactNode }) {
  return <div className="statlist">{children}</div>;
}

export function InfoRow({
  label,
  title,
  body,
  href,
  action,
  external,
  icon,
}: {
  label: string;
  title: string;
  body: string;
  href?: string;
  action?: string;
  external?: boolean;
  icon?: boolean;
}) {
  const content = (
    <>
      <p className="eyebrow eyebrow--plain mb-3">{label}</p>
      <h3 className="flex items-start gap-2 font-display text-xl uppercase leading-tight">
        {icon && <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--accent-deep)]" />}
        {title}
      </h3>
      <p className="mt-2 text-sm text-[var(--mute)]">{body}</p>
      {action && href && (
        <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--accent-deep)]">
          {action} <ArrowUpRight size={14} strokeWidth={2.5} />
        </span>
      )}
    </>
  );

  if (!href) return <div className="inforow">{content}</div>;
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inforow">
      {content}
    </a>
  ) : (
    <Link href={href} className="inforow">
      {content}
    </Link>
  );
}
