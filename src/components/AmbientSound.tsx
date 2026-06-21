"use client";

/**
 * AmbientSound — an optional, muted-by-default forest ambience toggle.
 * ────────────────────────────────────────────────────────────────────────
 * Synthesizes a soft low-passed wind bed with a slow LFO via the Web Audio
 * API (no audio files to ship). Off by default; remembers the user's choice
 * in localStorage but never autostarts audio (browsers block that anyway).
 * A small lower-corner pill with three bars that warm to amber when on.
 */

import { useEffect, useRef, useState } from "react";

export default function AmbientSound() {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ src: AudioBufferSourceNode; lfo: OscillatorNode; gain: GainNode } | null>(null);

  // Stop and tear down any running audio on unmount.
  useEffect(() => {
    return () => stop();
  }, []);

  function start() {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!ctxRef.current) ctxRef.current = new Ctx();
      const ac = ctxRef.current;
      if (ac.state === "suspended") ac.resume();

      const bufSize = 2 * ac.sampleRate;
      const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufSize; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 480;

      const gain = ac.createGain();
      gain.gain.value = 0;

      src.connect(lp);
      lp.connect(gain);
      gain.connect(ac.destination);

      const lfo = ac.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoGain = ac.createGain();
      lfoGain.gain.value = 0.025;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      src.start();
      lfo.start();
      gain.gain.linearRampToValueAtTime(0.06, ac.currentTime + 1.5);
      nodesRef.current = { src, lfo, gain };
    } catch {}
  }

  function stop() {
    try {
      const n = nodesRef.current;
      const ac = ctxRef.current;
      if (n && ac) {
        n.gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.8);
        setTimeout(() => {
          try {
            n.src.stop();
            n.lfo.stop();
          } catch {}
        }, 900);
        nodesRef.current = null;
      }
    } catch {}
  }

  function toggle() {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem("srt-sound", next ? "on" : "off");
    } catch {}
    if (next) start();
    else stop();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      data-on={on}
      className="sound-toggle"
      title="Toggle forest ambience"
      aria-pressed={on}
      aria-label={on ? "Turn forest ambience off" : "Turn forest ambience on"}
    >
      <span className="bar" style={{ height: 8 }} />
      <span className="bar" style={{ height: 14 }} />
      <span className="bar" style={{ height: 10 }} />
      <span className="label">{on ? "Forest on" : "Forest off"}</span>
    </button>
  );
}
