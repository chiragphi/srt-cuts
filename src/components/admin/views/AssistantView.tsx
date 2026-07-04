"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Check, Sparkles } from "lucide-react";
import { useAdmin } from "../data";

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
  loading?: boolean;
  isProposal?: boolean;
}

const SUGGESTIONS = ["Put 20% off the Fade", "Accept all pending bookings", "Block tomorrow", "End all discounts"];

export function AssistantView() {
  const { reload } = useAdmin();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const proposalCtx = useRef<{ role: string; content: string }[] | null>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  const send = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || busy) return;
      setInput("");
      const history = proposalCtx.current ?? [];
      setMessages((prev) => [
        ...prev.filter((m) => !m.loading),
        { role: "user", content: msg },
        { role: "assistant", content: "", loading: true },
      ]);
      setBusy(true);
      try {
        const res = await fetch("/api/admin/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg, history }),
        });
        const data = await res.json();
        proposalCtx.current = data.isProposal
          ? [
              { role: "user", content: msg },
              { role: "assistant", content: data.reply || "" },
            ]
          : null;
        setMessages((prev) => [
          ...prev.filter((m) => !m.loading),
          { role: "assistant", content: data.reply || "Done.", actions: data.actionsPerformed, isProposal: data.isProposal ?? false },
        ]);
        if (data.hasActions) reload();
      } catch {
        setMessages((prev) => [
          ...prev.filter((m) => !m.loading),
          { role: "assistant", content: "Something went wrong. Try again." },
        ]);
      } finally {
        setBusy(false);
        setTimeout(() => textareaRef.current?.focus(), 80);
      }
    },
    [input, busy, reload]
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div
      className="ax-card"
      style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: "60vh" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3" style={{ padding: "18px 20px", borderBottom: "1px solid var(--a-line)" }}>
        <span
          style={{
            display: "inline-flex",
            width: 38,
            height: 38,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 11,
            background: "var(--a-accent-soft)",
            color: "var(--a-accent-quiet)",
          }}
        >
          <Sparkles size={18} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15.5, fontWeight: 620 }}>Ops assistant</div>
          <div className="ax-eyebrow" style={{ fontSize: 11 }}>
            Groq · llama-3.3-70b
          </div>
        </div>
        <span className="ax-badge ax-badge--ok" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--s-ok)" }} />
          Live
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {isEmpty ? (
          <div style={{ margin: "auto", textAlign: "center", maxWidth: 420, display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
            <p style={{ fontSize: 14.5, color: "var(--a-text-3)", lineHeight: 1.55 }}>
              Tell me what to do — block dates, accept bookings, or change prices. I&apos;ll confirm anything that
              changes your data before doing it.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="ax-btn ax-btn--sm ax-btn--soft"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div style={{ maxWidth: "84%", display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    borderRadius: 14,
                    padding: "11px 15px",
                    fontSize: 14.5,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    background: msg.role === "user" ? "var(--a-accent-strong)" : "var(--a-surface-2)",
                    color: msg.role === "user" ? "#fff" : "var(--a-text)",
                    border: msg.role === "user" ? "none" : "1px solid var(--a-line)",
                  }}
                >
                  {msg.loading ? <TypingDots /> : msg.content}
                </div>
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.actions.map((a, j) => (
                      <span key={j} className="ax-badge ax-badge--ok" style={{ display: "inline-flex", gap: 5 }}>
                        <Check size={11} /> {a}
                      </span>
                    ))}
                  </div>
                )}
                {msg.isProposal && !msg.loading && (
                  <div className="flex gap-2">
                    <button
                      className="ax-btn ax-btn--sm ax-btn--primary"
                      onClick={() => {
                        setMessages((prev) => prev.map((m, idx) => (idx === i ? { ...m, isProposal: false } : m)));
                        send("Yes, confirmed");
                      }}
                    >
                      Yes, do it
                    </button>
                    <button
                      className="ax-btn ax-btn--sm"
                      onClick={() =>
                        setMessages((prev) =>
                          prev.map((m, idx) => (idx === i ? { ...m, isProposal: false, content: m.content + "\n\n(Cancelled)" } : m))
                        )
                      }
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div style={{ padding: 16, borderTop: "1px solid var(--a-line)" }}>
        <div
          className="flex items-end gap-2"
          style={{ background: "var(--a-surface-2)", border: "1px solid var(--a-line-strong)", borderRadius: 14, padding: "10px 12px" }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Block a date, accept a booking, update a price…"
            disabled={busy}
            style={{ flex: 1, resize: "none", background: "transparent", border: 0, outline: "none", color: "var(--a-text)", fontSize: 14.5, lineHeight: 1.5, maxHeight: 120 }}
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={!input.trim() || busy}
            aria-label="Send"
            className="ax-btn ax-btn--primary"
            style={{ width: 38, height: 38, minHeight: 38, padding: 0, flex: "none" }}
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5" style={{ height: 16 }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{ display: "block", width: 5, height: 5, borderRadius: "50%", background: "var(--a-accent)" }}
          animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
