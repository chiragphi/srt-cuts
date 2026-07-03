// src/components/ui/ServiceRow.tsx
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatPrice, effectivePrice, hasDiscount, clampDiscount } from "@/lib/services";
import type { SiteContent } from "@/lib/site-content";

type Service = SiteContent["serviceConfigs"][number];

export function ServiceRow({
  service,
  index,
  href = "/book",
  popular,
}: {
  service: Service;
  index?: number;
  href?: string;
  popular?: boolean;
}) {
  const sale = hasDiscount(service);
  const pct = clampDiscount(service.discountPercent);
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 border-b border-[var(--line-ink)] px-1 py-6 transition-colors last:border-b-0 hover:bg-[var(--ink-2)]"
    >
      {typeof index === "number" && (
        <span className="idx hidden w-10 shrink-0 sm:block">{String(index + 1).padStart(2, "0")}</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-2xl uppercase leading-none sm:text-3xl">{service.name}</h3>
          {sale && <span className="chip chip--accent">{pct}% off</span>}
          {popular && !sale && <span className="chip chip--accent">Most requested</span>}
        </div>
        <p className="mt-2 text-sm text-[var(--mute-ink)]">{service.desc}</p>
      </div>
      <div className="shrink-0 text-right">
        {sale ? (
          <p className="flex items-baseline justify-end gap-2">
            <span className="font-mono text-sm text-[var(--mute-ink)] line-through">{formatPrice(service.amount)}</span>
            <span className="spec text-xl text-[var(--ink)] sm:text-2xl">{formatPrice(effectivePrice(service))}</span>
          </p>
        ) : (
          <p className="spec text-xl text-[var(--ink)] sm:text-2xl">{formatPrice(service.amount)}</p>
        )}
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--mute-ink)]">{service.duration}</p>
      </div>
      <ArrowUpRight
        size={20}
        strokeWidth={2.5}
        className="hidden shrink-0 text-[var(--mute-ink)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--accent)] sm:block"
      />
    </Link>
  );
}
