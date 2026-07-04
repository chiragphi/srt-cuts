"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

// ── First-view trigger (once) ─────────────────────────────────────────
export function useInViewOnce<T extends Element>(margin = "0px 0px -8% 0px") {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: margin, threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, margin]);
  return { ref, seen };
}

// ── Count-up: animates once when scrolled into view ───────────────────
export function CountUp({
  value,
  format,
  duration = 900,
  className,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const { ref, seen } = useInViewOnce<HTMLSpanElement>();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const started = useRef(false);

  useEffect(() => {
    if (reduce) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(value);
      return;
    }
    if (!seen || started.current) return;
    started.current = true;
    const from = 0;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo — feels instant, settles cleanly
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, value, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  );
}

// ── Reveal: calm springy-but-quick entrance with optional stagger ─────
export function Reveal({
  children,
  delay = 0,
  y = 14,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  // Mount-based entrance (not scroll-gated): content is never left blank below
  // the fold or in headless/hidden-tab renders — the animation only enhances an
  // already-present element.
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Route/view cross-fade ─────────────────────────────────────────────
export function ViewFade({ id, children }: { id: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <div key={id}>{children}</div>;
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
