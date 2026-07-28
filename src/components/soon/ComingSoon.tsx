"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Emblem from "./Emblem";

const HEADLINE = ["Big", "things", "coming."];
const SUBLINE = "Check back soon.";

// The link-in-bio destination. Linked straight through rather than via the
// l.instagram.com shim, whose signed redirect only works from inside the app.
const BOOKING_URL =
  "https://app.perceny.com/book/savant-south-jordan-barbershop?utm_source=ig&utm_medium=social&utm_content=link_in_bio";

interface Thwip {
  id: number;
  x: number;
  y: number;
  ox: number;
  oy: number;
  len: number;
  rot: number;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function ComingSoon() {
  const tiltRef = useRef<HTMLDivElement>(null);
  const [thwips, setThwips] = useState<Thwip[]>([]);
  const [shaking, setShaking] = useState(false);
  const nextId = useRef(0);

  // Pointer parallax — the crest hangs in space and leans toward the cursor.
  // Lerped in a rAF loop so it glides instead of snapping, and only runs while
  // there is distance left to cover.
  useEffect(() => {
    const el = tiltRef.current;
    if (!el || prefersReducedMotion()) return;

    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;

    const tick = () => {
      cx += (tx - cx) * 0.075;
      cy += (ty - cy) * 0.075;
      el.style.transform =
        `perspective(1100px) rotateY(${(cx * 11).toFixed(2)}deg) rotateX(${(-cy * 11).toFixed(2)}deg)` +
        ` translate3d(${(cx * 18).toFixed(1)}px, ${(cy * 18).toFixed(1)}px, 0)`;
      raf = Math.abs(tx - cx) > 0.0015 || Math.abs(ty - cy) > 0.0015 ? requestAnimationFrame(tick) : 0;
    };

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Tap anywhere and the crest shoots a web at it.
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el || prefersReducedMotion()) return;

    const box = el.getBoundingClientRect();
    const ox = box.left + box.width / 2;
    const oy = box.top + box.height / 2;
    const dx = e.clientX - ox;
    const dy = e.clientY - oy;
    const len = Math.hypot(dx, dy);
    if (len < 40) return;

    const id = nextId.current++;
    setThwips((t) => [
      ...t.slice(-4),
      { id, x: e.clientX, y: e.clientY, ox, oy, len, rot: (Math.atan2(dy, dx) * 180) / Math.PI },
    ]);
    setShaking(true);

    window.setTimeout(() => setThwips((t) => t.filter((s) => s.id !== id)), 800);
    window.setTimeout(() => setShaking(false), 340);
  }, []);

  return (
    <div className={`soon-root${shaking ? " is-hit" : ""}`} onPointerDown={onPointerDown}>
      <div className="soon-bg" aria-hidden>
        <div className="soon-blob soon-blob--red" />
        <div className="soon-blob soon-blob--cyan" />
        <div className="soon-mesh">
          <Emblem uid="bg" plain />
        </div>
        <div className="soon-scan" />
      </div>

      <main className="soon-stage">
        <div className="crest-tilt" ref={tiltRef}>
          <div className="crest-sway">
            <div className="crest-stack">
              <div className="crest-ghost crest-ghost--red" aria-hidden>
                <Emblem uid="gr" plain />
              </div>
              <div className="crest-ghost crest-ghost--cyan" aria-hidden>
                <Emblem uid="gc" plain />
              </div>
              <div className="crest-main">
                <Emblem uid="main" />
              </div>
            </div>
          </div>
        </div>

        <h1 className="soon-headline">
          {HEADLINE.map((word, w) => (
            <span className="soon-word" key={word}>
              {[...word].map((ch, c) => {
                const i = HEADLINE.slice(0, w).join("").length + c;
                return (
                  <span className="soon-char" key={`${w}-${c}`} style={{ "--i": i } as React.CSSProperties}>
                    {ch}
                  </span>
                );
              })}
            </span>
          ))}
        </h1>

        <p className="soon-sub">
          {SUBLINE}
          <span className="soon-caret" aria-hidden />
        </p>

        <a className="soon-cta" href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
          Book a cut
          <span className="soon-cta-arrow" aria-hidden>
            →
          </span>
        </a>
        <p className="soon-shop">Savant Barbershop — South Jordan</p>
      </main>

      <footer className="soon-foot">SRT Cuts — Herriman, Utah</footer>

      <svg className="soon-thwips" aria-hidden>
        {thwips.map((t) => (
          <g className="thwip" key={t.id}>
            <line className="thwip-line" x1={t.ox} y1={t.oy} x2={t.x} y2={t.y} pathLength={1} />
            <g className="thwip-splat" transform={`translate(${t.x} ${t.y}) rotate(${t.rot})`}>
              <circle r={5} />
              <path d="M0 0L22 -13M0 0L24 4M0 0L14 20M0 0L-4 -22" />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
