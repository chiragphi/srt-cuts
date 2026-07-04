"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/auth";

type Step = "phone" | "password" | "verify" | "set-password";
type VerifyMethod = "sms" | "totp" | null;

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const stepAnim = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
};

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
  const [resendWait, setResendWait] = useState(0);
  const [error, setError] = useState("");
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (user) router.replace(isAdmin ? "/admin" : redirect);
  }, [user, isAdmin, redirect, router]);

  useEffect(() => {
    if (resendWait <= 0) return;
    const t = setTimeout(() => setResendWait((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendWait]);

  const digits = phone.replace(/\D/g, "");

  async function startVerify() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/verify/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: digits }) });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Failed to send verification.");
      if (typeof d.retryAfter === "number") setResendWait(d.retryAfter);
      return;
    }
    const d = await res.json();
    setVerifyMethod(d.method);
    setTotpSecret(d.secret || "");
    setVerifyReason(d.reason || "");
    setCode(["", "", "", "", "", ""]);
    setStep("verify");
    if (d.method === "sms") {
      setResendWait(60);
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    }
  }

  async function continueFromPhone() {
    setError("");
    if (digits.length < 10) { setError("Enter your 10-digit phone number."); return; }
    setLoading(true);
    const res = await fetch("/api/auth/check-phone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: digits }) });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Something went wrong."); return; }
    const d = await res.json();
    if (d.bypass && d.redirect) { refresh(); router.replace(d.redirect); return; }
    setIsForgotFlow(false);
    if (d.hasPassword) { setPassword(""); setStep("password"); }
    else { setIsNewUser(!d.exists); await startVerify(); }
  }

  async function submitPassword() {
    if (!password) { setError("Enter your password."); return; }
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: digits, password }) });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Invalid phone or password."); return; }
    refresh();
    router.replace(redirect);
  }

  async function forgotPassword() { setIsForgotFlow(true); setIsNewUser(false); await startVerify(); }
  async function resendCode() { setResending(true); await startVerify(); setResending(false); }

  async function verifyCode() {
    const full = code.join("");
    if (full.length !== 6) { setError("Enter the full 6-digit code."); return; }
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/verify/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: digits, code: full, name: isNewUser ? name : undefined }) });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Invalid code."); setCode(["", "", "", "", "", ""]); codeRefs.current[0]?.focus(); return; }
    const d = await res.json();
    setVerifiedToken(d.verifiedToken);
    setNewPassword("");
    setConfirmPassword("");
    setStep("set-password");
  }

  async function submitNewPassword() {
    setError("");
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords don't match."); return; }
    setLoading(true);
    const res = await fetch("/api/auth/set-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: digits, password: newPassword, verifiedToken }) });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Failed to set password."); return; }
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
  function backToPhone() { setStep("phone"); setError(""); setCode(["", "", "", "", "", ""]); }

  const errNode = error ? <p style={{ fontSize: 14, color: "var(--c-danger)" }}>{error}</p> : null;

  return (
    <div className="site" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "max(20px, env(safe-area-inset-top)) 20px 0" }}>
        <Link href="/" className="cx-textlink"><ArrowLeft size={15} /> SRT Cuts</Link>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <AnimatePresence mode="wait">
            {step === "phone" && (
              <motion.div key="phone" {...stepAnim}>
                <p className="cx-eyebrow" style={{ marginBottom: 16 }}>Sign in</p>
                <h1 className="cx-display cx-display--lg">Claim your <em>chair.</em></h1>
                <p style={{ margin: "12px 0 30px", fontSize: 15, color: "var(--c-ink-2)" }}>Enter your phone number to get started.</p>
                <div className="space-y-5">
                  <div>
                    <label className="cx-label">Phone number</label>
                    <input className="cx-field" type="tel" inputMode="numeric" placeholder="(801) 555-0100" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} onKeyDown={(e) => e.key === "Enter" && continueFromPhone()} autoFocus />
                  </div>
                  {errNode}
                  <button className="cx-btn cx-btn--accent cx-btn--block" onClick={continueFromPhone} disabled={loading}>{loading ? "Checking…" : "Continue"}</button>
                </div>
              </motion.div>
            )}

            {step === "password" && (
              <motion.div key="password" {...stepAnim}>
                <p className="cx-eyebrow" style={{ marginBottom: 16 }}>Welcome back</p>
                <h1 className="cx-display cx-display--lg">Enter your password</h1>
                <p style={{ margin: "12px 0 30px", fontSize: 15, color: "var(--c-ink-2)" }}>Signing in as <span className="cx-num" style={{ color: "var(--c-ink)", fontWeight: 550 }}>{phone}</span></p>
                <div className="space-y-5">
                  <div>
                    <label className="cx-label">Password</label>
                    <input className="cx-field" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitPassword()} autoFocus />
                  </div>
                  {errNode}
                  <button className="cx-btn cx-btn--accent cx-btn--block" onClick={submitPassword} disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
                </div>
                <div className="flex justify-between" style={{ marginTop: 16, fontSize: 13.5 }}>
                  <button className="cx-textlink" onClick={backToPhone}>Use a different number</button>
                  <button className="cx-textlink" style={{ color: "var(--c-accent-ink)" }} onClick={forgotPassword} disabled={loading}>Forgot password?</button>
                </div>
              </motion.div>
            )}

            {step === "verify" && (
              <motion.div key="verify" {...stepAnim}>
                <p className="cx-eyebrow" style={{ marginBottom: 16 }}>Verify</p>
                <h1 className="cx-display cx-display--lg">{isForgotFlow ? "Confirm it's you" : "Enter the code"}</h1>

                {verifyMethod === "sms" && (
                  <p style={{ margin: "12px 0 30px", fontSize: 15, color: "var(--c-ink-2)" }}>Sent a 6-digit code to <span className="cx-num" style={{ color: "var(--c-ink)", fontWeight: 550 }}>{phone}</span></p>
                )}
                {verifyMethod === "totp" && (
                  <div style={{ margin: "12px 0 26px" }} className="space-y-3">
                    <p style={{ fontSize: 14.5, color: "var(--c-ink-2)", lineHeight: 1.55 }}>We couldn&apos;t text a code to this number, so use an authenticator app instead (Google Authenticator, Microsoft Authenticator, or your iPhone&apos;s Passwords app).</p>
                    {verifyReason && <p style={{ fontSize: 12.5, color: "var(--c-ink-3)" }}>{verifyReason}</p>}
                    <div style={{ borderRadius: 12, border: "1px solid var(--c-line)", padding: 14, background: "var(--c-raise)" }}>
                      <p className="cx-label" style={{ marginBottom: 4 }}>Manual entry key</p>
                      <p className="cx-num" style={{ wordBreak: "break-all", fontSize: 14, color: "var(--c-ink)" }}>{totpSecret}</p>
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--c-ink-3)" }}>Add this key to your authenticator app, then enter the 6-digit code it shows.</p>
                  </div>
                )}

                {isNewUser && (
                  <div style={{ marginBottom: 20 }}>
                    <label className="cx-label">Your name</label>
                    <input className="cx-field" type="text" placeholder="First Last" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && code.join("").length === 6 && verifyCode()} />
                  </div>
                )}

                <div className="flex justify-center" style={{ gap: 8, marginBottom: 22 }}>
                  {code.map((d, i) => (
                    <input key={i} ref={(el) => { codeRefs.current[i] = el; }} className="cx-otp" type="text" inputMode="numeric" maxLength={1} value={d} onChange={(e) => handleCodeInput(i, e.target.value)} onKeyDown={(e) => handleCodeKeyDown(i, e)} />
                  ))}
                </div>

                {error && <p style={{ marginBottom: 16, textAlign: "center", fontSize: 14, color: "var(--c-danger)" }}>{error}</p>}

                <button className="cx-btn cx-btn--accent cx-btn--block" onClick={verifyCode} disabled={loading}>{loading ? "Verifying…" : "Continue"}</button>

                <div className="flex justify-between" style={{ marginTop: 16, fontSize: 13.5 }}>
                  <button className="cx-textlink" onClick={backToPhone}>Change number</button>
                  {verifyMethod === "sms" && (
                    <button className="cx-textlink" style={{ color: resendWait > 0 ? "var(--c-ink-3)" : "var(--c-accent-ink)" }} onClick={resendCode} disabled={resending || resendWait > 0}>
                      {resending ? "Sending…" : resendWait > 0 ? `Resend in ${resendWait}s` : "Resend code"}
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {step === "set-password" && (
              <motion.div key="set-password" {...stepAnim}>
                <p className="cx-eyebrow" style={{ marginBottom: 16 }}>Secure your account</p>
                <h1 className="cx-display cx-display--lg">{isForgotFlow ? "Set a new password" : "Set a password"}</h1>
                <p style={{ margin: "12px 0 30px", fontSize: 14.5, color: "var(--c-ink-2)", lineHeight: 1.55 }}>This device will be remembered — you won&apos;t need to verify again here. On a new device, you&apos;ll sign in with this password.</p>
                <div className="space-y-5">
                  <div>
                    <label className="cx-label">New password</label>
                    <input className="cx-field" type="password" placeholder="At least 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus />
                  </div>
                  <div>
                    <label className="cx-label">Confirm password</label>
                    <input className="cx-field" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitNewPassword()} />
                  </div>
                  {errNode}
                  <button className="cx-btn cx-btn--accent cx-btn--block" onClick={submitNewPassword} disabled={loading}>{loading ? "Saving…" : "Continue"}</button>
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
    <Suspense fallback={<div className="site" style={{ minHeight: "100dvh" }} />}>
      <AuthForm />
    </Suspense>
  );
}
