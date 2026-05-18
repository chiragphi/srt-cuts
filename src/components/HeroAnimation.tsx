"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import Image from "next/image";

const HAIR_COUNT = 180;

interface Hair {
  baseX: number;
  x: number;
  vel: number;
  phase: number;
  thickness: number;
  lengthMul: number;
  brightMul: number;
  layer: number; // 0=bg 1=mid 2=fg
  initDelay: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  hue: number;
  life: number;
  maxLife: number;
}

export default function HeroAnimation({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const t0 = useRef<number>(0);
  const hairsRef = useRef<Hair[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const combXRef = useRef<number>(99999);
  const combYRef = useRef<number>(-99999);
  const prevCombYRef = useRef<number>(-99999);
  const combImageRef = useRef<HTMLImageElement | null>(null);
  const scaleVal = useMotionValue(1);
  const zoomStarted = useRef(false);
  const showLogoRef = useRef(false);
  const showTextRef = useRef(false);
  const fadingRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  const [showLogo, setShowLogo] = useState(false);
  const [showText, setShowText] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const combImage = new window.Image();
    combImage.onload = () => {
      combImageRef.current = combImage;
    };
    combImage.src = "/assets/comb.png";

    function init() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      hairsRef.current = Array.from({ length: HAIR_COUNT }, (_, i) => {
        const layer = i % 3;
        return {
          baseX: (i / (HAIR_COUNT - 1)) * canvas!.width,
          x: (i / (HAIR_COUNT - 1)) * canvas!.width,
          vel: 0,
          phase: Math.random() * Math.PI * 2,
          thickness:
            layer === 0 ? 0.4 + Math.random() * 0.5
            : layer === 1 ? 0.7 + Math.random() * 0.7
            : 1.1 + Math.random() * 1.1,
          lengthMul: 0.88 + Math.random() * 0.28,
          brightMul:
            layer === 0 ? 0.45 + Math.random() * 0.3
            : layer === 1 ? 0.8 + Math.random() * 0.4
            : 1.0 + Math.random() * 0.5,
          layer,
          initDelay: Math.random() * 550,
        };
      });
    }
    init();
    window.addEventListener("resize", init);

    // ── Particles ────────────────────────────────────────────────────────────
    function spawnParticles(cx: number, cy: number, count: number) {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: cx + (Math.random() - 0.5) * 46,
          y: cy + (Math.random() - 0.5) * 120,
          vx: (Math.random() - 0.5) * 1.8,
          vy: -0.4 - Math.random() * 2.2,
          alpha: 0.55 + Math.random() * 0.45,
          size: 0.8 + Math.random() * 2.8,
          hue: Math.random() > 0.5 ? 265 : 212,
          life: 0,
          maxLife: 55 + Math.random() * 90,
        });
      }
      if (particlesRef.current.length > 140) {
        particlesRef.current = particlesRef.current.slice(-140);
      }
    }

    function tickParticles(combPhase: number) {
      ctx.save();
      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy *= 0.985;
        p.vx *= 0.972;
        const ratio = p.life / p.maxLife;
        if (ratio >= 1) return false;
        const a = p.alpha * (1 - ratio) * Math.min(1, combPhase * 2.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - ratio * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},88%,72%,${a.toFixed(2)})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${p.hue},80%,65%,${(a * 0.55).toFixed(2)})`;
        ctx.fill();
        return true;
      });
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── Light rays ────────────────────────────────────────────────────────────
    function drawLightRays(elapsed: number) {
      const W = canvas!.width, H = canvas!.height;
      const cx = W / 2, cy = H / 2;
      const p = Math.max(0, Math.min(1, (elapsed - 4200) / 2200));
      if (p <= 0) return;
      const numRays = 20;
      const maxLen = Math.hypot(W, H) * 0.6;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < numRays; i++) {
        const angle = (i / numRays) * Math.PI * 2 + p * 0.08;
        const len = maxLen * Math.min(1, p * 2.5);
        const alpha = Math.max(0, 0.16 * (1 - p * 0.75));
        const x2 = cx + Math.cos(angle) * len;
        const y2 = cy + Math.sin(angle) * len;
        const hue = 260 + (i % 3) * 20;
        const g = ctx.createLinearGradient(cx, cy, x2, y2);
        g.addColorStop(0, `hsla(${hue},90%,68%,${alpha})`);
        g.addColorStop(0.35, `hsla(${hue + 10},80%,55%,${(alpha * 0.45).toFixed(2)})`);
        g.addColorStop(1, "hsla(240,60%,35%,0)");
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = g;
        ctx.lineWidth = 2 + Math.abs(Math.sin(i * 1.3)) * 2.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── Background ────────────────────────────────────────────────────────────
    function drawBg(elapsed: number) {
      const W = canvas!.width, H = canvas!.height;
      const brighten = Math.min(0.18, (elapsed - 1800) / 8000);
      const r = Math.round(12 + brighten * 22);
      const g2 = Math.round(2 + brighten * 4);
      const b = Math.round(28 + brighten * 22);
      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.9);
      bg.addColorStop(0, `rgb(${r},${g2},${b})`);
      bg.addColorStop(0.5, "#0A0014");
      bg.addColorStop(1, "#030008");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
    }

    // ── Center glow ───────────────────────────────────────────────────────────
    function drawCenterGlow(elapsed: number) {
      const W = canvas!.width, H = canvas!.height;
      const p = Math.max(0, Math.min(1, (elapsed - 1400) / 2200));
      if (p <= 0) return;
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.32);
      g.addColorStop(0, `rgba(85,20,160,${(p * 0.3).toFixed(2)})`);
      g.addColorStop(0.45, `rgba(48,10,105,${(p * 0.16).toFixed(2)})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // ── Hair layer ────────────────────────────────────────────────────────────
    function drawHairLayer(layer: number, elapsed: number, globalAlpha: number) {
      const W = canvas!.width, H = canvas!.height;
      const cx = combXRef.current;
      const partCx = W / 2;

      hairsRef.current.forEach((h) => {
        if (h.layer !== layer) return;
        const introA = Math.min(1, Math.max(0, (elapsed - h.initDelay) / 650));
        const alpha = globalAlpha * introA;
        if (alpha < 0.01) return;

        const dToComb = h.baseX - cx;
        let target = 0;
        if (dToComb > -8 && dToComb < 92) {
          target = 72 * (1 - Math.max(0, dToComb) / 92) * (dToComb <= 0 ? -1 : 1);
        } else if (dToComb <= -8 && dToComb > -520) {
          target = dToComb * 0.033;
        }
        h.vel = (h.vel + (target - (h.x - h.baseX)) * 0.11) * 0.805;
        h.x = h.baseX + h.vel * 9;

        const fromCenter = h.x - partCx;
        const glowR = W * (0.27 + layer * 0.045);
        const glow = Math.max(0, 1 - Math.abs(fromCenter) / glowR) * h.brightMul;
        const wave = Math.sin(elapsed * 0.00125 + h.phase) * (2.2 + layer * 0.6);
        const isLeft = fromCenter < 0;

        const grad = ctx.createLinearGradient(h.x, 0, h.x, H * h.lengthMul);

        if (glow > 0.035) {
          const hue = isLeft ? 264 : 214;
          const s = 68 + glow * 22;
          const l = 48 + glow * 32;
          const a = alpha * (0.28 + glow * 0.72);
          grad.addColorStop(0, `hsla(${hue},${s.toFixed(0)}%,${l.toFixed(0)}%,${(a * 0.78).toFixed(2)})`);
          grad.addColorStop(0.28, `hsla(${hue + 14},${s.toFixed(0)}%,${(l - 9).toFixed(0)}%,${a.toFixed(2)})`);
          grad.addColorStop(0.68, `hsla(${hue - 9},${(s - 13).toFixed(0)}%,${(l - 22).toFixed(0)}%,${(a * 0.68).toFixed(2)})`);
          grad.addColorStop(1, `hsla(${hue},44%,12%,${(a * 0.18).toFixed(2)})`);
          ctx.shadowBlur = (8 + layer * 6) * glow;
          ctx.shadowColor = isLeft
            ? `rgba(148,50,235,${(glow * alpha * 0.82).toFixed(2)})`
            : `rgba(58,130,248,${(glow * alpha * 0.68).toFixed(2)})`;
        } else {
          const d = layer === 0 ? 0.45 : layer === 1 ? 0.72 : 0.92;
          const a = alpha * d;
          grad.addColorStop(0, `rgba(28,9,48,${(a * 0.92).toFixed(2)})`);
          grad.addColorStop(0.5, `rgba(16,5,30,${(a * 0.86).toFixed(2)})`);
          grad.addColorStop(1, `rgba(7,2,14,${(a * 0.78).toFixed(2)})`);
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.moveTo(h.x + wave, 0);
        ctx.bezierCurveTo(
          h.x + wave * 0.58, H * 0.26,
          h.x - wave * 0.38 + h.vel * 2.8, H * 0.62,
          h.x + wave * 0.22 + h.vel * 7.5, H * h.lengthMul
        );
        ctx.strokeStyle = grad;
        ctx.lineWidth = h.thickness * (1 + glow * 0.75) * (layer === 0 ? 0.78 : layer === 1 ? 1 : 1.25);
        ctx.stroke();
        ctx.shadowBlur = 0;
      });
    }

    // ── Comb ──────────────────────────────────────────────────────────────────
    function drawComb(cx: number, cy: number, phase: number) {
      const W = canvas!.width, H = canvas!.height;
      const combImage = combImageRef.current;
      if (!combImage || cx < -220 || cx > W + 220 || cy < -H || cy > H * 1.7) return;
      const aspect = combImage.width / combImage.height || 0.5;
      const combH = Math.min(H * 0.72, W * 0.78 / aspect);
      const combW = combH * aspect;
      const x = cx - combW / 2;
      const y = cy - combH / 2;

      ctx.save();
      ctx.globalAlpha = Math.min(1, phase * 3);
      ctx.shadowBlur = 36;
      ctx.shadowColor = "rgba(168,85,247,0.8)";
      ctx.drawImage(combImage, x, y, combW, combH);
      ctx.restore();
    }

    // ── Vignette ──────────────────────────────────────────────────────────────
    function drawVignette() {
      const W = canvas!.width, H = canvas!.height;
      const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, W * 0.78);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // ── Main loop ─────────────────────────────────────────────────────────────
    function frame(ts: number) {
      if (!t0.current) t0.current = ts;
      const elapsed = ts - t0.current;
      const W = canvas!.width;
      const H = canvas!.height;

      const COMB_START = 900, COMB_DUR = 2800;
      if (elapsed >= COMB_START && elapsed < COMB_START + COMB_DUR) {
        const t = (elapsed - COMB_START) / COMB_DUR;
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const combH = Math.min(H * 0.72, W * 1.56);
        combXRef.current = W * 0.56 + Math.sin(t * Math.PI) * W * 0.035;
        combYRef.current = -combH * 0.58 + e * (H + combH * 1.1);
        if (
          Math.abs(prevCombYRef.current - combYRef.current) > 5 &&
          combYRef.current > -80 && combYRef.current < H + 80
        ) {
          spawnParticles(combXRef.current, combYRef.current, 3);
        }
        prevCombYRef.current = combYRef.current;
      } else if (elapsed >= COMB_START + COMB_DUR) {
        combXRef.current = -99999;
        combYRef.current = -99999;
      }

      const hairAlpha = Math.min(1, elapsed / 550);
      const combPhase = Math.max(0, (elapsed - COMB_START) / 1200);

      ctx.clearRect(0, 0, W, H);
      drawBg(elapsed);
      drawCenterGlow(elapsed);
      ctx.save(); drawHairLayer(0, elapsed, hairAlpha); ctx.restore();
      tickParticles(combPhase);
      ctx.save(); drawHairLayer(1, elapsed, hairAlpha); ctx.restore();
      ctx.save(); drawHairLayer(2, elapsed, hairAlpha); ctx.restore();
      drawLightRays(elapsed);
      drawVignette();
      drawComb(combXRef.current, combYRef.current, combPhase);

      if (elapsed > 3100 && !zoomStarted.current) {
        zoomStarted.current = true;
        animate(scaleVal, 15, { duration: 3.8, ease: [0.1, 1, 0.18, 1] });
      }
      if (elapsed > 4300 && !showLogoRef.current) {
        showLogoRef.current = true;
        setShowLogo(true);
      }
      if (elapsed > 5100 && !showTextRef.current) {
        showTextRef.current = true;
        setShowText(true);
      }
      if (elapsed > 7800 && !fadingRef.current) {
        fadingRef.current = true;
        setFading(true);
        setTimeout(() => onCompleteRef.current(), 1050);
      }

      if (elapsed < 9200) animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", init);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden bg-black"
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 1.05, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ scale: scaleVal, transformOrigin: "50% 50%" }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
      </motion.div>

      <AnimatePresence>
        {showLogo && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.65 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.3, ease: [0.1, 1, 0.18, 1] }}
          >
            <motion.div
              animate={{
                filter: [
                  "drop-shadow(0 0 45px rgba(139,92,246,0.92)) drop-shadow(0 0 90px rgba(100,40,210,0.55))",
                  "drop-shadow(0 0 75px rgba(139,92,246,1))    drop-shadow(0 0 150px rgba(100,40,210,0.78))",
                  "drop-shadow(0 0 50px rgba(139,92,246,0.94)) drop-shadow(0 0 100px rgba(100,40,210,0.6))",
                ],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image
                src="/srt-logo.png"
                alt="SRT Cats"
                width={230}
                height={230}
                priority
                className="object-contain"
              />
            </motion.div>

            <AnimatePresence>
              {showText && (
                <motion.p
                  className="mt-5 text-xs tracking-[0.55em] uppercase font-light"
                  style={{ color: "#C4B5FD" }}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                >
                  Herriman, Utah
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="absolute bottom-10 right-10 text-xs tracking-widest uppercase text-white/22 hover:text-white/55 transition-colors cursor-pointer bg-transparent border-none font-sans"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        onClick={() => {
          if (!fadingRef.current) {
            fadingRef.current = true;
            setFading(true);
            setTimeout(() => onCompleteRef.current(), 1050);
          }
        }}
      >
        Skip
      </motion.button>
    </motion.div>
  );
}
