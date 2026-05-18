"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

type Step = "phone" | "code";

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/book";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Check already logged in
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user) router.replace(redirect); })
      .catch(() => {});
  }, [redirect, router]);

  async function sendCode() {
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit US phone number.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: digits }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Failed to send code.");
      return;
    }
    setStep("code");
    setTimeout(() => codeRefs.current[0]?.focus(), 100);
  }

  async function verifyCode() {
    const full = code.join("");
    if (full.length !== 6) { setError("Enter the full 6-digit code."); return; }
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.replace(/\D/g, ""), code: full, name }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Invalid code.");
      setCode(["", "", "", "", "", ""]);
      codeRefs.current[0]?.focus();
      return;
    }
    router.replace(redirect);
  }

  function handleCodeInput(i: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[i] = val.slice(-1);
    setCode(next);
    if (val && i < 5) codeRefs.current[i + 1]?.focus();
  }

  function handleCodeKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      codeRefs.current[i - 1]?.focus();
    }
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(e.target.value));
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Back link */}
      <div className="p-6">
        <Link href="/" className="text-sm text-white/35 hover:text-white/70 transition-colors">
          ← SRT Cuts
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex justify-center mb-10">
            <Image
              src="/srt-logo.png"
              alt="SRT"
              width={64}
              height={64}
              className="object-contain"
              style={{ filter: "drop-shadow(0 0 16px rgba(139,92,246,0.8))" }}
            />
          </div>

          <AnimatePresence mode="wait">
            {step === "phone" && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1
                  className="font-semibold text-white text-center mb-2"
                  style={{ fontSize: 28, letterSpacing: "-0.025em" }}
                >
                  Sign in
                </h1>
                <p className="text-sm text-center mb-8" style={{ color: "#86868B" }}>
                  Enter your phone number to continue.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-white/40 mb-2 tracking-wide uppercase">
                      Phone Number
                    </label>
                    <input
                      className="input-field"
                      type="tel"
                      placeholder="(801) 555-0100"
                      value={phone}
                      onChange={handlePhoneChange}
                      onKeyDown={(e) => e.key === "Enter" && sendCode()}
                      autoFocus
                    />
                  </div>

                  {isNewUser && (
                    <div>
                      <label className="block text-xs text-white/40 mb-2 tracking-wide uppercase">
                        Your Name
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        placeholder="First Last"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  )}

                  {error && (
                    <p className="text-sm text-red-400 text-center">{error}</p>
                  )}

                  <button
                    className="btn-primary w-full"
                    onClick={sendCode}
                    disabled={loading}
                  >
                    {loading ? "Sending…" : "Send Code"}
                  </button>

                  <p className="text-xs text-center mt-2" style={{ color: "#6E6E73" }}>
                    New here?{" "}
                    <button
                      className="text-purple-400 hover:text-purple-300 transition-colors bg-transparent border-none cursor-pointer"
                      onClick={() => setIsNewUser((v) => !v)}
                    >
                      {isNewUser ? "Sign in instead" : "Create account"}
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {step === "code" && (
              <motion.div
                key="code"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1
                  className="font-semibold text-white text-center mb-2"
                  style={{ fontSize: 28, letterSpacing: "-0.025em" }}
                >
                  Enter code
                </h1>
                <p className="text-sm text-center mb-8" style={{ color: "#86868B" }}>
                  We sent a 6-digit code to{" "}
                  <span className="text-white/70">{phone}</span>
                </p>

                {!isNewUser && (
                  <div className="mb-4">
                    <label className="block text-xs text-white/40 mb-2 tracking-wide uppercase">
                      Your Name
                    </label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="First Last"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}

                {/* OTP grid */}
                <div className="flex gap-2 justify-center mb-6">
                  {code.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { codeRefs.current[i] = el; }}
                      className="otp-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleCodeInput(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-sm text-red-400 text-center mb-4">{error}</p>
                )}

                <button
                  className="btn-primary w-full"
                  onClick={verifyCode}
                  disabled={loading}
                >
                  {loading ? "Verifying…" : "Continue"}
                </button>

                <button
                  className="w-full text-center text-sm mt-4 bg-transparent border-none cursor-pointer transition-colors"
                  style={{ color: "#86868B" }}
                  onClick={() => { setStep("phone"); setCode(["","","","","",""]); setError(""); }}
                >
                  Change number
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <AuthForm />
    </Suspense>
  );
}
