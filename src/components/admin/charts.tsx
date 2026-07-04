"use client";

import { useId } from "react";
import { useInViewOnce } from "./motion";

// All charts are hand-rolled SVG: thin lines, few gridlines, no chartjunk.
// They draw in ONCE on first view (via IntersectionObserver + the `ax-draw`
// CSS animation, which reduced-motion disables). Stroke width stays crisp at
// any container width thanks to `vector-effect="non-scaling-stroke"`.

const ACCENT = "var(--a-accent)";

function linePath(values: number[], w: number, h: number, pad = 2) {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const stepX = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (1 - (v - min) / span) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

// ── Sparkline — hero companion ────────────────────────────────────────
export function Sparkline({ values, height = 44 }: { values: number[]; height?: number }) {
  const { ref, seen } = useInViewOnce<HTMLDivElement>();
  const w = 100;
  const h = 40;
  const d = linePath(values, w, h);
  const last = values.length ? values[values.length - 1] : 0;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const stepX = values.length > 1 ? (w - 4) / (values.length - 1) : 0;
  const lastX = 2 + (values.length - 1) * stepX;
  const lastY = 2 + (1 - (last - min) / span) * (h - 4);
  return (
    <div ref={ref} style={{ width: "100%", height }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="100%" aria-hidden>
        <path
          d={d}
          fill="none"
          stroke={ACCENT}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          className={seen ? "ax-draw" : undefined}
          style={{ ["--len" as string]: 1 }}
        />
        {values.length > 0 && (
          <circle cx={lastX} cy={lastY} r={2.6} fill={ACCENT} vectorEffect="non-scaling-stroke" />
        )}
      </svg>
    </div>
  );
}

// ── Area + line — revenue/volume trend ────────────────────────────────
export function AreaChart({
  values,
  labels,
  height = 200,
  format,
}: {
  values: number[];
  labels: string[];
  height?: number;
  format?: (n: number) => string;
}) {
  const gid = useId().replace(/:/g, "");
  const { ref, seen } = useInViewOnce<HTMLDivElement>();
  const w = 100;
  const h = 60;
  const pad = 3;
  const d = linePath(values, w, h, pad);
  const stepX = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const area =
    d +
    ` L${(pad + (values.length - 1) * stepX).toFixed(2)},${h - pad} L${pad},${h - pad} Z`;

  // sparse x labels (first, mid, last) to keep it airy
  const showIdx = new Set([0, Math.floor(labels.length / 2), labels.length - 1]);

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden>
        <defs>
          <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* single baseline gridline, quiet */}
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--a-line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <path d={area} fill={`url(#fill-${gid})`} className={seen ? "ax-fade-in" : undefined} opacity={seen ? 1 : 0} />
        <path
          d={d}
          fill="none"
          stroke={ACCENT}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          className={seen ? "ax-draw" : undefined}
          style={{ ["--len" as string]: 1 }}
        />
      </svg>
      <div className="mt-3 flex justify-between text-[11px]" style={{ color: "var(--a-text-3)" }}>
        {labels.map((l, i) => (
          <span key={i} className="ax-num" style={{ opacity: showIdx.has(i) ? 1 : 0 }}>
            {l}
          </span>
        ))}
      </div>
      {format && values.length > 0 && (
        <div className="sr-only">Latest {format(values[values.length - 1])}</div>
      )}
    </div>
  );
}

// ── Horizontal bars — service / client rankings ───────────────────────
export function BarRows({
  data,
}: {
  data: { label: string; value: number; caption?: string }[];
}) {
  const { ref, seen } = useInViewOnce<HTMLDivElement>();
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div ref={ref} className="space-y-4">
      {data.map((d, i) => (
        <div key={d.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="text-[14px]" style={{ color: "var(--a-text)" }}>
              {d.label}
            </span>
            <span className="ax-num text-[13px]" style={{ color: "var(--a-text-2)" }}>
              {d.caption ?? d.value}
            </span>
          </div>
          <div
            style={{ height: 8, borderRadius: 999, background: "var(--a-surface-3)", overflow: "hidden" }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 999,
                background: "var(--a-accent)",
                width: seen ? `${Math.max(3, (d.value / max) * 100)}%` : "0%",
                transition: `width 0.9s var(--a-ease-out) ${i * 0.06}s`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Donut — payment / status split ────────────────────────────────────
export function Donut({
  segments,
  size = 132,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const { ref, seen } = useInViewOnce<HTMLDivElement>();
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  const stroke = 14;
  // Precompute each arc's dash length + start offset up front (no mutation
  // during the JSX render pass).
  const arcs: { color: string; dash: number; offset: number }[] = [];
  let running = 0;
  for (const s of segments) {
    const dash = (s.value / total) * c;
    arcs.push({ color: s.color, dash, offset: running });
    running += dash;
  }
  return (
    <div ref={ref} className="flex items-center gap-5">
      <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
        <svg viewBox="0 0 100 100" width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--a-surface-3)" strokeWidth={stroke} />
          {arcs.map((a, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={stroke}
              strokeDasharray={`${seen ? a.dash : 0} ${c}`}
              strokeDashoffset={-a.offset}
              strokeLinecap="butt"
              style={{ transition: `stroke-dasharray 0.9s var(--a-ease-out) ${i * 0.08}s` }}
            />
          ))}
        </svg>
        {(centerValue || centerLabel) && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {centerValue && (
              <span className="ax-num" style={{ fontSize: 20, fontWeight: 650, color: "var(--a-text)" }}>
                {centerValue}
              </span>
            )}
            {centerLabel && <span style={{ fontSize: 11, color: "var(--a-text-3)" }}>{centerLabel}</span>}
          </div>
        )}
      </div>
      <div className="space-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flex: "none" }} />
            <span className="text-[13px]" style={{ color: "var(--a-text-2)" }}>
              {s.label}
            </span>
            <span className="ax-num text-[13px]" style={{ color: "var(--a-text-3)" }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Heatmap — day × time-slot density ─────────────────────────────────
export function Heatmap({
  cells,
  max,
  rows,
  cols,
}: {
  cells: { row: number; col: number; count: number }[];
  max: number;
  rows: string[]; // time slots (y)
  cols: string[]; // days (x)
}) {
  const { ref, seen } = useInViewOnce<HTMLDivElement>();
  const grid = new Map<string, number>();
  for (const c of cells) grid.set(`${c.row}:${c.col}`, c.count);
  return (
    <div ref={ref}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `44px repeat(${cols.length}, 1fr)`,
          gap: 4,
          alignItems: "center",
        }}
      >
        <span />
        {cols.map((d) => (
          <span key={d} className="text-center text-[11px]" style={{ color: "var(--a-text-3)" }}>
            {d}
          </span>
        ))}
        {rows.map((slot, ri) => (
          <RowFragment
            key={slot}
            slot={slot}
            ri={ri}
            cols={cols}
            grid={grid}
            max={max}
            seen={seen}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px]" style={{ color: "var(--a-text-3)" }}>
        <span>Quiet</span>
        {[0.12, 0.3, 0.55, 0.8, 1].map((o) => (
          <span
            key={o}
            style={{ width: 16, height: 10, borderRadius: 3, background: "var(--a-accent)", opacity: o }}
          />
        ))}
        <span>Busy</span>
      </div>
    </div>
  );
}

function RowFragment({
  slot,
  ri,
  cols,
  grid,
  max,
  seen,
}: {
  slot: string;
  ri: number;
  cols: string[];
  grid: Map<string, number>;
  max: number;
  seen: boolean;
}) {
  // Only label alternate rows to keep it airy.
  const label = ri % 2 === 0 ? slot.replace(":00", "").replace(" ", "") : "";
  return (
    <>
      <span className="text-right text-[10.5px] ax-num" style={{ color: "var(--a-text-3)", paddingRight: 4 }}>
        {label}
      </span>
      {cols.map((_, ci) => {
        const count = grid.get(`${ri}:${ci}`) ?? 0;
        const intensity = count === 0 ? 0 : 0.14 + (count / max) * 0.82;
        return (
          <div
            key={ci}
            title={`${count} booking${count === 1 ? "" : "s"}`}
            style={{
              aspectRatio: "1.6 / 1",
              minHeight: 14,
              borderRadius: 4,
              background: count === 0 ? "var(--a-surface-2)" : "var(--a-accent)",
              opacity: seen ? (count === 0 ? 1 : intensity) : 0,
              transition: `opacity 0.5s var(--a-ease-out) ${(ri * cols.length + ci) * 0.004}s`,
            }}
          />
        );
      })}
    </>
  );
}

// ── Meter — utilization / rate ────────────────────────────────────────
export function Meter({ value, label }: { value: number; label: string }) {
  const { ref, seen } = useInViewOnce<HTMLDivElement>();
  const pctVal = Math.round(value * 100);
  return (
    <div ref={ref}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[13px]" style={{ color: "var(--a-text-3)" }}>
          {label}
        </span>
        <span className="ax-num text-[15px]" style={{ color: "var(--a-text)" }}>
          {pctVal}%
        </span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: "var(--a-surface-3)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            borderRadius: 999,
            background: "var(--a-accent)",
            width: seen ? `${pctVal}%` : "0%",
            transition: "width 1s var(--a-ease-out)",
          }}
        />
      </div>
    </div>
  );
}
