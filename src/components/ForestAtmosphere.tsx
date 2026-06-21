"use client";

/**
 * ForestAtmosphere — the ambient "Dusk in the Pines" layer.
 * ────────────────────────────────────────────────────────────────────────
 *   • A fixed full-screen canvas: drifting fog, rising embers, and warm
 *     fireflies that softly gather toward the cursor (desktop only).
 *   • Two blurred amber light-shafts breathing through the canopy.
 *   • A parallax stand of pine silhouettes that drift on scroll.
 *   • Film grain for a hand-finished, un-templated texture.
 *
 * All motion is gated behind prefers-reduced-motion. Pointer-events are off
 * throughout, so this never intercepts clicks. It sits at z-index 0; page
 * content lives above it via `.forest-content`.
 */

import { useEffect, useRef } from "react";

const PINES = [
  { depth: 0.06, style: { left: "-2%", top: "8%", width: 160, opacity: 0.5, animation: "srt-drift 14s ease-in-out infinite" } },
  { depth: 0.14, style: { right: "4%", top: "14%", width: 110, opacity: 0.38, animation: "srt-drift-b 11s ease-in-out infinite" } },
  { depth: 0.1, style: { left: "8%", top: "46%", width: 90, opacity: 0.3, animation: "srt-drift-b 16s ease-in-out infinite" } },
  { depth: 0.18, style: { right: "14%", top: "54%", width: 200, opacity: 0.42, animation: "srt-drift 18s ease-in-out infinite" } },
  { depth: 0.08, style: { left: "40%", top: "78%", width: 130, opacity: 0.28, animation: "srt-drift-b 13s ease-in-out infinite" } },
  { depth: 0.22, style: { right: "-2%", top: "84%", width: 240, opacity: 0.5, animation: "srt-drift 20s ease-in-out infinite" } },
] as const;

function Pine() {
  return (
    <svg viewBox="0 0 100 150" width="100%" style={{ display: "block" }} aria-hidden>
      <rect x={46} y={120} width={8} height={28} fill="#0c1410" />
      <polygon points="50,8 78,58 22,58" fill="#101c14" />
      <polygon points="50,38 84,92 16,92" fill="#0e1912" />
      <polygon points="50,68 90,126 10,126" fill="#0c1610" />
    </svg>
  );
}

export default function ForestAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const treesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Parallax pines on scroll ──
    const treeEls = treesRef.current
      ? Array.from(treesRef.current.querySelectorAll<HTMLElement>("[data-depth]"))
      : [];
    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        const y = window.scrollY || 0;
        treeEls.forEach((t) => {
          const d = parseFloat(t.getAttribute("data-depth") || "0.1");
          t.style.transform = `translateY(${y * d}px)`;
        });
      });
    };
    if (!reduced) window.addEventListener("scroll", onScroll, { passive: true });

    // ── Ambient canvas ──
    let raf = 0;
    let onMove: ((e: MouseEvent) => void) | null = null;
    let onResize: (() => void) | null = null;

    const cv = canvasRef.current;
    if (cv && !reduced) {
      const ctx = cv.getContext("2d");
      if (ctx) {
        let W = 0;
        let H = 0;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const resize = () => {
          W = window.innerWidth;
          H = window.innerHeight;
          cv.width = W * dpr;
          cv.height = H * dpr;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        onResize = resize;
        window.addEventListener("resize", resize);

        const mouse = { x: W / 2, y: H / 2, has: false };
        onMove = (e: MouseEvent) => {
          mouse.x = e.clientX;
          mouse.y = e.clientY;
          mouse.has = true;
        };
        window.addEventListener("mousemove", onMove, { passive: true });

        const rnd = (a: number, b: number) => a + Math.random() * (b - a);
        const isDesktop = window.matchMedia("(pointer:fine)").matches;

        const fog = Array.from({ length: 4 }, (_, i) => ({
          x: rnd(0, W),
          y: rnd(H * 0.2, H),
          r: rnd(220, 460),
          vx: rnd(0.08, 0.22) * (i % 2 ? 1 : -1),
          hue: i % 2 ? "rgba(40,70,50," : "rgba(60,90,60,",
        }));
        const embers = Array.from({ length: 26 }, () => ({
          x: rnd(0, W),
          y: rnd(0, H),
          vy: rnd(0.2, 0.7),
          r: rnd(0.6, 1.8),
          a: rnd(0.2, 0.7),
          tw: rnd(0, 6.28),
        }));
        const flies = Array.from({ length: 16 }, () => ({
          x: rnd(0, W),
          y: rnd(0, H),
          vx: rnd(-0.3, 0.3),
          vy: rnd(-0.3, 0.3),
          r: rnd(1.2, 2.6),
          tw: rnd(0, 6.28),
        }));

        let t = 0;
        const draw = () => {
          t += 1;
          ctx.clearRect(0, 0, W, H);

          // fog
          fog.forEach((f) => {
            f.x += f.vx;
            if (f.x < -f.r) f.x = W + f.r;
            if (f.x > W + f.r) f.x = -f.r;
            const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
            g.addColorStop(0, f.hue + "0.06)");
            g.addColorStop(1, f.hue + "0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, 6.2832);
            ctx.fill();
          });

          // embers
          embers.forEach((e) => {
            e.y -= e.vy;
            e.x += Math.sin((t + e.tw * 40) * 0.01) * 0.3;
            if (e.y < -6) {
              e.y = H + 6;
              e.x = rnd(0, W);
            }
            const fl = 0.5 + 0.5 * Math.sin(t * 0.05 + e.tw);
            ctx.beginPath();
            ctx.fillStyle = "rgba(224,164,88," + (e.a * fl * 0.6).toFixed(3) + ")";
            ctx.arc(e.x, e.y, e.r, 0, 6.2832);
            ctx.fill();
          });

          // fireflies (desktop) — gently drift, softly gather toward cursor
          if (isDesktop) {
            flies.forEach((f) => {
              if (mouse.has) {
                const dx = mouse.x - f.x;
                const dy = mouse.y - f.y;
                const dist = Math.hypot(dx, dy) || 1;
                if (dist < 260) {
                  const pull = (1 - dist / 260) * 0.05;
                  f.vx += (dx / dist) * pull;
                  f.vy += (dy / dist) * pull;
                }
              }
              f.vx += Math.sin(t * 0.013 + f.tw * 7) * 0.006;
              f.vy += Math.cos(t * 0.011 + f.tw * 5) * 0.006;
              f.vx *= 0.96;
              f.vy *= 0.96;
              const sp = Math.hypot(f.vx, f.vy);
              const max = 0.9;
              if (sp > max) {
                f.vx = (f.vx / sp) * max;
                f.vy = (f.vy / sp) * max;
              }
              f.x += f.vx;
              f.y += f.vy;
              const m = 30;
              if (f.x < m) { f.x = m; f.vx = Math.abs(f.vx); }
              if (f.x > W - m) { f.x = W - m; f.vx = -Math.abs(f.vx); }
              if (f.y < m) { f.y = m; f.vy = Math.abs(f.vy); }
              if (f.y > H - m) { f.y = H - m; f.vy = -Math.abs(f.vy); }
              f.tw += 0.02;
              const glow = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(f.tw));
              const R = f.r * 5;
              const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, R);
              g.addColorStop(0, "rgba(240,200,120," + (0.7 * glow).toFixed(3) + ")");
              g.addColorStop(0.4, "rgba(224,164,88," + (0.22 * glow).toFixed(3) + ")");
              g.addColorStop(1, "rgba(224,164,88,0)");
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(f.x, f.y, R, 0, 6.2832);
              ctx.fill();
              ctx.beginPath();
              ctx.fillStyle = "rgba(255,236,190," + (0.85 * glow).toFixed(3) + ")";
              ctx.arc(f.x, f.y, f.r * 0.7, 0, 6.2832);
              ctx.fill();
            });
          }

          raf = requestAnimationFrame(draw);
        };
        draw();
      }
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      window.removeEventListener("scroll", onScroll);
      if (onMove) window.removeEventListener("mousemove", onMove);
      if (onResize) window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="forest-canvas" aria-hidden />

      <div className="forest-shafts" aria-hidden>
        <div
          className="forest-shaft"
          style={{
            left: "18%",
            width: "18vw",
            background: "linear-gradient(180deg, rgba(224,164,88,0.1), rgba(224,164,88,0))",
            transform: "rotate(8deg)",
            animation: "srt-shaft 9s ease-in-out infinite",
          }}
        />
        <div
          className="forest-shaft"
          style={{
            left: "62%",
            width: "12vw",
            background: "linear-gradient(180deg, rgba(224,164,88,0.07), rgba(224,164,88,0))",
            transform: "rotate(-6deg)",
            animation: "srt-shaft 12s ease-in-out infinite",
          }}
        />
      </div>

      <div className="forest-trees" ref={treesRef} aria-hidden>
        {PINES.map((p, i) => (
          <div key={i} className="forest-tree" data-depth={p.depth} style={p.style}>
            <Pine />
          </div>
        ))}
      </div>

      <div className="forest-grain" aria-hidden />
    </>
  );
}
