"use client";

import { useCallback, useEffect, useState } from "react";

interface State {
  active: boolean;
  name?: string;
}

// Rendered globally (root layout). For everyone who isn't currently
// impersonating it renders nothing. When the admin is viewing as a customer it
// shows an unmistakable, always-present floating bar with an Exit that clears
// the cookie and returns to /admin. Self-contained styles — it lives outside
// the admin scope, on customer pages, and shares nothing with either app.
export default function ImpersonationBanner() {
  const [state, setState] = useState<State>({ active: false });
  const [leaving, setLeaving] = useState(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/impersonate", { cache: "no-store" });
      const data = await res.json();
      setState(data?.active ? { active: true, name: data.user?.name } : { active: false });
    } catch {
      setState({ active: false });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    check();
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [check]);

  async function exit() {
    setLeaving(true);
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
    } catch {
      /* clearing is best-effort */
    }
    window.location.href = "/admin";
  }

  if (!state.active) return null;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .srt-imp {
            position: fixed; left: 50%; transform: translateX(-50%);
            bottom: calc(env(safe-area-inset-bottom, 0px) + 88px);
            z-index: 2147483000;
            display: flex; align-items: center; gap: 14px;
            padding: 10px 12px 10px 18px; border-radius: 999px;
            background: #7a63ff; color: #fff;
            font-family: var(--font-instrument), system-ui, sans-serif;
            box-shadow: 0 18px 44px -14px rgba(74,54,180,0.8), 0 0 0 1px rgba(255,255,255,0.14) inset;
            max-width: calc(100vw - 24px);
          }
          @media (min-width: 640px) { .srt-imp { bottom: 24px; } }
          .srt-imp__dot { width: 8px; height: 8px; border-radius: 50%; background:#fff; flex:none;
            box-shadow: 0 0 0 4px rgba(255,255,255,0.28); animation: srt-imp-pulse 2s ease-in-out infinite; }
          @keyframes srt-imp-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
          .srt-imp__txt { font-size: 14px; font-weight: 550; letter-spacing:-0.01em;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .srt-imp__txt b { font-weight: 700; }
          .srt-imp__exit { flex:none; appearance:none; border:0; cursor:pointer;
            font: inherit; font-size: 13px; font-weight: 650; color:#3a2c9c;
            background:#fff; padding: 8px 15px; border-radius: 999px; }
          .srt-imp__exit:disabled { opacity:.6; cursor: default; }
          .srt-imp__exit:focus-visible { outline: 3px solid rgba(255,255,255,0.7); outline-offset: 2px; }
          @media (prefers-reduced-motion: reduce) { .srt-imp__dot { animation: none; } }
        `,
        }}
      />
      <div className="srt-imp" role="status" aria-live="polite">
        <span className="srt-imp__dot" aria-hidden />
        <span className="srt-imp__txt">
          Viewing as <b>{state.name ?? "customer"}</b>
        </span>
        <button type="button" className="srt-imp__exit" onClick={exit} disabled={leaving}>
          {leaving ? "Exiting…" : "Exit"}
        </button>
      </div>
    </>
  );
}
