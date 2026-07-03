// src/components/ui/Section.tsx
import { type ReactNode } from "react";
import clsx from "clsx";

export function Section({
  id,
  band,
  tight,
  className,
  children,
}: {
  id?: string;
  band?: boolean;
  tight?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={clsx(tight ? "section-tight" : "section", band && "band-ink", className)}>
      <div className="shell">{children}</div>
    </section>
  );
}

export function SectionHeader({
  idx,
  title,
  sub,
}: {
  idx: string;
  title: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="mb-10">
      <p className="idx mb-4">{idx}</p>
      <h2 className="display display--xl">{title}</h2>
      {sub && <p className="mt-4 max-w-md text-[var(--mute)]">{sub}</p>}
    </div>
  );
}
