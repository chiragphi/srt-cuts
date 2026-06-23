"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
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
      setError("Enter your 10-digit phone number.");
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
      setError(d.error === "Invalid phone number" ? "Enter a valid 10-digit US phone number." : d.error || "Failed to send code.");
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
    if (full.length !== 6) {
      setError("Enter the full 6-digit code.");
      return;
    }
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
    if (e.key === "Backspace" && !code[i] && i > 0) codeRefs.current[i - 1]?.focus();
    if (e.key === "Enter" && code.join("").length === 6) verifyCode();
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(e.target.value));
  }

  return (
    <div className="band-ink flex min-h-screen flex-col">
      <div className="p-5 pt-[max(20px,env(safe-area-inset-top))]">
        <Link href="/" className="font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--mute-ink)] transition-colors hover:text-[var(--paper)]">
          ← SRT.CUTS
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            {step === "phone" && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="idx mb-4">[ SIGN IN ]</p>
                <h1 className="display display--lg">
                  Claim your <span className="hot">chair.</span>
                </h1>
                <p className="mb-8 mt-3 text-sm text-[var(--mute-ink)]">Enter your phone number — we&apos;ll text a code.</p>

                <div className="space-y-4">
                  <div>
                    <label className="field-label">Phone number</label>
                    <input
                      className="field"
                      type="tel"
                      inputMode="numeric"
                      placeholder="(801) 555-0100"
                      value={phone}
                      onChange={handlePhoneChange}
                      onKeyDown={(e) => e.key === "Enter" && sendCode()}
                      autoFocus
                    />
                  </div>

                  {error && <p className="text-sm text-[var(--accent)]">{error}</p>}

                  <button className="btn btn--accent btn--block" onClick={sendCode} disabled={loading}>
                    {loading ? "Sending…" : "Send code"}
                  </button>
                </div>
              </motion.div>
            )}

            {step === "code" && (
              <motion.div
                key="code"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="idx mb-4">[ VERIFY ]</p>
                <h1 className="display display--lg">Enter the code</h1>
                <p className="mb-8 mt-3 text-sm text-[var(--mute-ink)]">
                  Sent a 6-digit code to <span className="spec text-[var(--paper)]">{phone}</span>
                </p>

                {isNewUser && (
                  <div className="mb-5">
                    <label className="field-label">Your name</label>
                    <input
                      className="field"
                      type="text"
                      placeholder="First Last"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && code.join("").length === 6 && verifyCode()}
                    />
                  </div>
                )}

                <div className="mb-6 flex justify-center gap-2">
                  {code.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { codeRefs.current[i] = el; }}
                      className="otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleCodeInput(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    />
                  ))}
                </div>

                {error && <p className="mb-4 text-center text-sm text-[var(--accent)]">{error}</p>}

                <button className="btn btn--accent btn--block" onClick={verifyCode} disabled={loading}>
                  {loading ? "Verifying…" : "Continue"}
                </button>

                <div className="mt-4 flex justify-between font-mono text-[11px] font-bold uppercase tracking-[0.08em]">
                  <button
                    className="text-[var(--mute-ink)] transition-colors hover:text-[var(--paper)]"
                    onClick={() => { setStep("phone"); setCode(["", "", "", "", "", ""]); setError(""); }}
                  >
                    Change number
                  </button>
                  <button
                    className="text-[var(--accent)] transition-colors hover:text-[var(--paper)]"
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
    <Suspense fallback={<div className="min-h-screen bg-[var(--ink)]" />}>
      <AuthForm />
    </Suspense>
  );
}
