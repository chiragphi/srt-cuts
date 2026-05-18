"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import Image from "next/image";

const HAIR_COUNT = 110;

interface Hair {
  baseX: number;
  x: number;
  vel: number;
  phase: number;
  thickness: number;
}

export default function HeroAnimation({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const t0 = useRef<number>(0);
  const hairsRef = useRef<Hair[]>([]);
  const combXRef = useRef<number>(9999);
  const scaleVal = useMotionValue(1);
  const zoomStarted = useRef(false);
  const showLogoRef = useRef(false);
  const fadingRef = useRef(false);
  const [showLogo, setShowLogo] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function init() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      hairsRef.current = Array.from({ length: HAIR_COUNT }, (_, i) => ({
        baseX: (i / (HAIR_COUNT - 1)) * canvas!.width,
        x: (i / (HAIR_COUNT - 1)) * canvas!.width,
        vel: 0,
        phase: Math.random() * Math.PI * 2,
        thickness: 0.7 + Math.random() * 1.3,
      }));
    }
    init();
    window.addEventListener("resize", init);

    function drawBg() {
      const W = canvas!.width, H = canvas!.height;
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.85);
      g.addColorStop(0, "#0E0022");
      g.addColorStop(0.55, "#080014");
      g.addColorStop(1, "#030009");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    function drawHairs(elapsed: number) {
      const W = canvas!.width, H = canvas!.height;
      const cx = combXRef.current;
      const partCx = W / 2;
      const hairs = hairsRef.current;

      hairs.forEach((h) => {
        const distToComb = h.baseX - cx;
        let target = 0;

        if (distToComb > -8 && distToComb < 90) {
          const push = 1 - Math.max(0, distToComb) / 90;
          target = 65 * push * (distToComb <= 0 ? -1 : 1);
        } else if (distToComb <= -8 && distToComb > -500) {
          target = distToComb * 0.035;
        }

        const spring = (target - (h.x - h.baseX)) * 0.11;
        h.vel = (h.vel + spring) * 0.81;
        h.x = h.baseX + h.vel * 9;

        const fromCenter = h.x - partCx;
        const glow = Math.max(0, 1 - Math.abs(fromCenter) / (W * 0.32));
        const wave = Math.sin(elapsed * 0.0013 + h.phase) * 2.5;
        const isLeft = fromCenter < 0;

        const grad = ctx.createLinearGradient(h.x, 0, h.x, H);
        if (glow > 0.04) {
          const hue = isLeft ? 268 : 218;
          const s = 72 + glow * 18;
          const l = 52 + glow * 28;
          const a = 0.3 + glow * 0.7;
          grad.addColorStop(0, `hsla(${hue},${s}%,${l}%,${(a * 0.85).toFixed(2)})`);
          grad.addColorStop(0.35, `hsla(${hue + 12},${s}%,${l - 8}%,${a.toFixed(2)})`);
          grad.addColorStop(0.72, `hsla(${hue - 8},${s - 10}%,${l - 18}%,${(a * 0.75).toFixed(2)})`);
          grad.addColorStop(1, `hsla(${hue},45%,14%,${(a * 0.3).toFixed(2)})`);
          ctx.shadowBlur = 14 * glow;
          ctx.shadowColor = isLeft
            ? `rgba(147,51,234,${(glow * 0.85).toFixed(2)})`
            : `rgba(59,130,246,${(glow * 0.75).toFixed(2)})`;
        } else {
          grad.addColorStop(0, "rgba(32,12,52,0.92)");
          grad.addColorStop(0.5, "rgba(20,8,36,0.88)");
          grad.addColorStop(1, "rgba(10,4,20,0.8)");
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.moveTo(h.x + wave, 0);
        ctx.bezierCurveTo(
          h.x + wave * 0.55,
          H * 0.28,
          h.x - wave * 0.35 + h.vel * 3,
          H * 0.64,
          h.x + wave * 0.25 + h.vel * 7,
          H
        );
        ctx.strokeStyle = grad;
        ctx.lineWidth = h.thickness * (1 + glow * 0.6);
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
    }

    function drawCenterGlow(elapsed: number) {
      const W = canvas!.width, H = canvas!.height;
      const p = Math.max(0, Math.min(1, (elapsed - 1800) / 1400));
      if (p <= 0) return;
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.28);
      g.addColorStop(0, `rgba(90,30,160,${(p * 0.22).toFixed(2)})`);
      g.addColorStop(0.5, `rgba(50,15,110,${(p * 0.12).toFixed(2)})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    function drawComb(cx: number) {
      const W = canvas!.width, H = canvas!.height;
      if (cx < -180 || cx > W + 180) return;
      const toothN = 18;
      const combH = H * 0.62;
      const spW = 26;
      const toothLen = 42;
      const startY = H * 0.19;
      const spacing = combH / toothN;

      ctx.save();
      ctx.shadowBlur = 22;
      ctx.shadowColor = "rgba(139,92,246,0.55)";

      const sg = ctx.createLinearGradient(cx, 0, cx + spW, 0);
      sg.addColorStop(0, "rgba(72,32,128,0.82)");
      sg.addColorStop(0.5, "rgba(110,58,190,0.88)");
      sg.addColorStop(1, "rgba(54,24,96,0.76)");
      ctx.fillStyle = sg;
      ctx.strokeStyle = "rgba(155,90,245,0.55)";
      ctx.lineWidth = 1;
      ctx.fillRect(cx, startY, spW, combH);
      ctx.strokeRect(cx, startY, spW, combH);

      for (let i = 0; i < toothN; i++) {
        const ty = startY + i * spacing + spacing / 2;
        const tg = ctx.createLinearGradient(cx - toothLen, ty, cx, ty);
        tg.addColorStop(0, "rgba(90,40,170,0.35)");
        tg.addColorStop(1, "rgba(130,75,210,0.88)");
        ctx.strokeStyle = tg;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(cx, ty);
        ctx.lineTo(cx - toothLen, ty);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx - toothLen, ty, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(190,140,255,0.9)";
        ctx.fill();
      }
      ctx.restore();
    }

    function frame(ts: number) {
      if (!t0.current) t0.current = ts;
      const elapsed = ts - t0.current;
      const W = canvas!.width;

      // Comb sweeps right→left over 3 seconds
      if (elapsed < 3000) {
        const t = elapsed / 3000;
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        combXRef.current = W + 160 - e * (W + 340);
      } else {
        combXRef.current = -9999;
      }

      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      drawBg();
      drawCenterGlow(elapsed);
      ctx.save();
      drawHairs(elapsed);
      ctx.restore();
      drawComb(combXRef.current);

      // Trigger zoom at 2.6s
      if (elapsed > 2600 && !zoomStarted.current) {
        zoomStarted.current = true;
        animate(scaleVal, 13, { duration: 3.2, ease: [0.16, 1, 0.3, 1] });
      }

      // Show logo at 3.8s
      if (elapsed > 3800 && !showLogoRef.current) {
        showLogoRef.current = true;
        setShowLogo(true);
      }

      // Fade out at 6.8s
      if (elapsed > 6800 && !fadingRef.current) {
        fadingRef.current = true;
        setFading(true);
        setTimeout(() => onComplete(), 1100);
      }

      if (elapsed < 8200) {
        animRef.current = requestAnimationFrame(frame);
      }
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
      transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Zooming canvas wrapper */}
      <motion.div
        className="absolute inset-0"
        style={{ scale: scaleVal, transformOrigin: "50% 50%" }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
      </motion.div>

      {/* Logo reveal — stays centered, not affected by zoom scale */}
      <AnimatePresence>
        {showLogo && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="relative"
              style={{ filter: "drop-shadow(0 0 48px rgba(139,92,246,0.95)) drop-shadow(0 0 96px rgba(99,51,234,0.55))" }}
            >
              <Image
                src="/srt-logo.png"
                alt="SRT Cats"
                width={200}
                height={200}
                priority
                className="object-contain"
              />
            </div>
            <motion.p
              className="mt-5 text-xs tracking-[0.45em] uppercase text-purple-300 font-light"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              Herriman, Utah
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip button */}
      <motion.button
        className="absolute bottom-10 right-10 text-xs tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors cursor-pointer bg-transparent border-none font-sans"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        onClick={() => {
          fadingRef.current = true;
          setFading(true);
          setTimeout(() => onComplete(), 1100);
        }}
      >
        Skip
      </motion.button>
    </motion.div>
  );
}
