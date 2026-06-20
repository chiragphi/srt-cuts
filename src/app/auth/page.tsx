"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/auth";

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
  const { user, refresh } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [isNewUser, setIsNewUser] = useState(true);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (user) router.replace(redirect);
  }, [user, redirect, router]);

  async function sendCode() {
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter your 10-digit phone number.");
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
      setError(
        d.error === "Invalid phone number"
          ? "Please enter a valid 10-digit US phone number."
          : d.error || "Failed to send code."
      );
      return;
    }
    const d = await res.json();
    if (d.bypass && d.redirect) {
      refresh();
      router.replace(d.redirect);
      return;
    }
    setIsNewUser(d.isNewUser ?? true);
    setStep("code");
    setTimeout(() => codeRefs.current[0]?.focus(), 100);
  }

  async function resendCode() {
    setResending(true);
    setError("");
    const digits = phone.replace(/\D/g, "");
    await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: digits }),
    }).catch(() => {});
    setResending(false);
    setCode(["", "", "", "", "", ""]);
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
      body: JSON.stringify({ phone: phone.replace(/\D/g, ""), code: full, name: isNewUser ? name : undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Invalid code.");
      setCode(["", "", "", "", "", ""]);
      codeRefs.current[0]?.focus();
      return;
    }
    refresh();
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
    if (e.key === "Enter" && code.join("").length === 6) verifyCode();
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(e.target.value));
  }

  return (
    <div className="min-h-screen flex flex-col mobile-page-pad">
      <div className="p-5 pt-[max(20px,env(safe-area-inset-top))]">
        <Link href="/" className="text-sm font-semibold text-[#8c857a] hover:text-[#f5f0e6] transition-colors">
          ← SRT Cuts
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-[20rem] sm:max-w-sm">
          <div className="flex justify-center mb-8">
            <Image src="/srt-logo.png" alt="SRT" width={64} height={64} className="object-contain rounded-2xl" />
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
                <h1 className="font-semibold text-[#f5f0e6] text-center mb-2" style={{ fontSize: 28, letterSpacing: "-0.025em" }}>
                  Sign in
                </h1>
                <p className="text-sm text-center mb-8 text-[#8c857a]">
                  Enter your phone number to continue.
                </p>

                <div className="space-y-4 app-card p-4">
                  <div>
                    <label className="block mobile-section-label mb-2">Phone Number</label>
                    <input
                      className="input-field"
                      type="tel"
                      inputMode="numeric"
                      placeholder="(801) 555-0100"
                      value={phone}
                      onChange={handlePhoneChange}
                      onKeyDown={(e) => e.key === "Enter" && sendCode()}
                      autoFocus
                    />
                  </div>

                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                  <button className="btn-primary w-full" onClick={sendCode} disabled={loading}>
                    {loading ? "Sending…" : "Send Code"}
                  </button>
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
                <h1 className="font-semibold text-[#f5f0e6] text-center mb-2" style={{ fontSize: 28, letterSpacing: "-0.025em" }}>
                  Enter code
                </h1>
                <p className="text-sm text-center mb-8 text-[#8c857a]">
                  We sent a 6-digit code to{" "}
                  <span className="font-semibold text-[#f5f0e6]">{phone}</span>
                </p>

                {isNewUser && (
                  <div className="app-card p-4 mb-4">
                    <label className="block mobile-section-label mb-2">Your Name</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="First Last"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && code.join("").length === 6 && verifyCode()}
                    />
                  </div>
                )}

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

                {error && <p className="text-sm text-red-500 text-center mb-4">{error}</p>}

                <button className="btn-primary w-full" onClick={verifyCode} disabled={loading}>
                  {loading ? "Verifying…" : "Continue"}
                </button>

                <div className="flex justify-between mt-4">
                  <button
                    className="text-sm bg-transparent border-none cursor-pointer transition-colors text-[#8c857a] hover:text-[#f5f0e6]"
                    onClick={() => { setStep("phone"); setCode(["","","","","",""]); setError(""); }}
                  >
                    Change number
                  </button>
                  <button
                    className="text-sm bg-transparent border-none cursor-pointer transition-colors text-[#e8b84b] hover:text-[#f5f0e6] font-semibold"
                    onClick={resendCode}
                    disabled={resending}
                  >
                    {resending ? "Sending…" : "Resend code"}
                  </button>
                </div>
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
    <Suspense fallback={<div className="min-h-screen" />}>
      <AuthForm />
    </Suspense>
  );
}
