"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/auth";

type Step = "phone" | "password" | "verify" | "set-password";
type VerifyMethod = "sms" | "totp" | null;

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
  const { user, isAdmin, refresh } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [isNewUser, setIsNewUser] = useState(true);
  const [isForgotFlow, setIsForgotFlow] = useState(false);

  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [verifyMethod, setVerifyMethod] = useState<VerifyMethod>(null);
  const [totpSecret, setTotpSecret] = useState("");
  const [verifyReason, setVerifyReason] = useState("");
  const [verifiedToken, setVerifiedToken] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (user) router.replace(isAdmin ? "/admin" : redirect);
  }, [user, isAdmin, redirect, router]);

  const digits = phone.replace(/\D/g, "");

  async function startVerify() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/verify/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: digits }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Failed to send verification.");
      return;
    }
    const d = await res.json();
    setVerifyMethod(d.method);
    setTotpSecret(d.secret || "");
    setVerifyReason(d.reason || "");
    setCode(["", "", "", "", "", ""]);
    setStep("verify");
    if (d.method === "sms") setTimeout(() => codeRefs.current[0]?.focus(), 100);
  }

  async function continueFromPhone() {
    setError("");
    if (digits.length < 10) {
      setError("Enter your 10-digit phone number.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/check-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: digits }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Something went wrong.");
      return;
    }
    const d = await res.json();
    if (d.bypass && d.redirect) {
      refresh();
      router.replace(d.redirect);
      return;
    }
    setIsForgotFlow(false);
    if (d.hasPassword) {
      setPassword("");
      setStep("password");
    } else {
      setIsNewUser(!d.exists);
      await startVerify();
    }
  }

  async function submitPassword() {
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: digits, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Invalid phone or password.");
      return;
    }
    refresh();
    router.replace(redirect);
  }

  async function forgotPassword() {
    setIsForgotFlow(true);
    setIsNewUser(false);
    await startVerify();
  }

  async function resendCode() {
    setResending(true);
    await startVerify();
    setResending(false);
  }

  async function verifyCode() {
    const full = code.join("");
    if (full.length !== 6) {
      setError("Enter the full 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/verify/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: digits, code: full, name: isNewUser ? name : undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Invalid code.");
      setCode(["", "", "", "", "", ""]);
      codeRefs.current[0]?.focus();
      return;
    }
    const d = await res.json();
    setVerifiedToken(d.verifiedToken);
    setNewPassword("");
    setConfirmPassword("");
    setStep("set-password");
  }

  async function submitNewPassword() {
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: digits, password: newPassword, verifiedToken }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Failed to set password.");
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

  function backToPhone() {
    setStep("phone");
    setError("");
    setCode(["", "", "", "", "", ""]);
  }

  return (
    <div className="band-ink flex min-h-screen flex-col">
      <div className="p-5 pt-[max(20px,env(safe-area-inset-top))]">
        <Link href="/" className="font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--mute-ink)] transition-colors hover:text-[var(--ink)]">
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
                <p className="mb-8 mt-3 text-sm text-[var(--mute-ink)]">Enter your phone number to get started.</p>

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
                      onKeyDown={(e) => e.key === "Enter" && continueFromPhone()}
                      autoFocus
                    />
                  </div>

                  {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

                  <button className="btn btn--accent btn--block" onClick={continueFromPhone} disabled={loading}>
                    {loading ? "Checking…" : "Continue"}
                  </button>
                </div>
              </motion.div>
            )}

            {step === "password" && (
              <motion.div
                key="password"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="idx mb-4">[ WELCOME BACK ]</p>
                <h1 className="display display--lg">Enter your password</h1>
                <p className="mb-8 mt-3 text-sm text-[var(--mute-ink)]">
                  Signing in as <span className="spec text-[var(--ink)]">{phone}</span>
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="field-label">Password</label>
                    <input
                      className="field"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitPassword()}
                      autoFocus
                    />
                  </div>

                  {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

                  <button className="btn btn--accent btn--block" onClick={submitPassword} disabled={loading}>
                    {loading ? "Signing in…" : "Sign in"}
                  </button>
                </div>

                <div className="mt-4 flex justify-between font-mono text-[11px] font-bold uppercase tracking-[0.08em]">
                  <button className="text-[var(--mute-ink)] transition-colors hover:text-[var(--ink)]" onClick={backToPhone}>
                    Use a different number
                  </button>
                  <button
                    className="text-[var(--accent)] transition-colors hover:text-[var(--ink)]"
                    onClick={forgotPassword}
                    disabled={loading}
                  >
                    Forgot password?
                  </button>
                </div>
              </motion.div>
            )}

            {step === "verify" && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="idx mb-4">[ VERIFY ]</p>
                <h1 className="display display--lg">
                  {isForgotFlow ? "Confirm it's you" : "Enter the code"}
                </h1>

                {verifyMethod === "sms" && (
                  <p className="mb-8 mt-3 text-sm text-[var(--mute-ink)]">
                    Sent a 6-digit code to <span className="spec text-[var(--ink)]">{phone}</span>
                  </p>
                )}

                {verifyMethod === "totp" && (
                  <div className="mb-8 mt-3 space-y-3">
                    <p className="text-sm text-[var(--mute-ink)]">
                      We couldn&apos;t text a code to this number, so use an authenticator app instead
                      (Google Authenticator, Microsoft Authenticator, or your iPhone&apos;s Passwords app).
                    </p>
                    {verifyReason && <p className="text-xs text-[var(--mute-ink)]">{verifyReason}</p>}
                    <div className="rounded-md border border-[var(--rule)] p-3">
                      <p className="field-label mb-1">Manual entry key</p>
                      <p className="spec break-all text-[13px] text-[var(--ink)]">{totpSecret}</p>
                    </div>
                    <p className="text-xs text-[var(--mute-ink)]">
                      Add this key to your authenticator app, then enter the 6-digit code it shows.
                    </p>
                  </div>
                )}

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

                {error && <p className="mb-4 text-center text-sm text-[var(--danger)]">{error}</p>}

                <button className="btn btn--accent btn--block" onClick={verifyCode} disabled={loading}>
                  {loading ? "Verifying…" : "Continue"}
                </button>

                <div className="mt-4 flex justify-between font-mono text-[11px] font-bold uppercase tracking-[0.08em]">
                  <button className="text-[var(--mute-ink)] transition-colors hover:text-[var(--ink)]" onClick={backToPhone}>
                    Change number
                  </button>
                  {verifyMethod === "sms" && (
                    <button
                      className="text-[var(--accent)] transition-colors hover:text-[var(--ink)]"
                      onClick={resendCode}
                      disabled={resending}
                    >
                      {resending ? "Sending…" : "Resend code"}
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {step === "set-password" && (
              <motion.div
                key="set-password"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="idx mb-4">[ SECURE YOUR ACCOUNT ]</p>
                <h1 className="display display--lg">{isForgotFlow ? "Set a new password" : "Set a password"}</h1>
                <p className="mb-8 mt-3 text-sm text-[var(--mute-ink)]">
                  This device will be remembered — you won&apos;t need to verify again here. On a new
                  device, you&apos;ll sign in with this password.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="field-label">New password</label>
                    <input
                      className="field"
                      type="password"
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="field-label">Confirm password</label>
                    <input
                      className="field"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitNewPassword()}
                    />
                  </div>

                  {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

                  <button className="btn btn--accent btn--block" onClick={submitNewPassword} disabled={loading}>
                    {loading ? "Saving…" : "Continue"}
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
    <Suspense fallback={<div className="min-h-screen bg-[var(--paper)]" />}>
      <AuthForm />
    </Suspense>
  );
}
