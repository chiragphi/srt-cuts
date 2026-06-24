"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Check, ChevronDown, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
  loading?: boolean;
  isProposal?: boolean;
}

const SUGGESTIONS = [
  "Put 20% off the Fade",
  "Accept all pending bookings",
  "Block tomorrow",
  "End all discounts",
];

export default function AdminAgent({ onRefresh }: { onRefresh: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Each command runs as a fresh session so stale history can never wedge the
  // assistant (the old "works once, then you must refresh" bug). The only
  // context carried forward is an open proposal awaiting a yes/no, so the
  // "propose → confirm" flow still resolves. The visible chat log is untouched.
  const proposalCtx = useRef<{ role: string; content: string }[] | null>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  }, [input]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;

    setInput("");
    if (!open) setOpen(true);

    // Fresh session by default; only an open proposal carries context.
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

      // Hold context only while a proposal is awaiting confirmation; otherwise
      // the next command starts a clean session.
      proposalCtx.current = data.isProposal
        ? [
            { role: "user", content: msg },
            { role: "assistant", content: data.reply || "" },
          ]
        : null;

      setMessages((prev) => [
        ...prev.filter((m) => !m.loading),
        {
          role: "assistant",
          content: data.reply || "Done.",
          actions: data.actionsPerformed,
          isProposal: data.isProposal ?? false,
        },
      ]);

      if (data.hasActions) onRefresh();
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => !m.loading),
        { role: "assistant", content: "Something went wrong. Try again." },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="mb-6 overflow-hidden rounded-[6px] border border-[var(--line-strong)] bg-[var(--paper)] sm:mb-8">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between border-b border-[var(--line)] px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] bg-[var(--accent)] text-[#ffffff]">
            <Sparkles size={17} />
          </span>
          <div className="text-left">
            <p className="font-display text-lg uppercase leading-none">AI Assistant</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--mute)]">Powered by Groq · llama-3.3-70b</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#2f7d46]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ad07a] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2f7d46]" />
            </span>
            Live
          </span>
          <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.2 }} className="text-[var(--mute)]">
            <ChevronDown size={16} />
          </motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            {/* Messages */}
            <div ref={scrollRef} className="space-y-3 overflow-y-auto px-5 py-4" style={{ maxHeight: 320, minHeight: isEmpty ? 112 : undefined }}>
              {isEmpty ? (
                <div className="flex flex-col items-center justify-center gap-4 py-2">
                  <p className="text-center text-sm text-[var(--mute)]">Tell me what to do — block dates, accept bookings, update prices.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="rounded-full border border-[var(--accent)]/40 bg-[rgba(91,70,240,0.08)] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--accent-deep)] transition-transform active:scale-95"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[86%] space-y-2">
                      <div
                        className="rounded-[6px] px-4 py-3 text-sm leading-relaxed"
                        style={
                          msg.role === "user"
                            ? { background: "var(--accent)", color: "#ffffff" }
                            : { background: "var(--paper-2)", border: "1px solid var(--line)", color: "var(--ink)" }
                        }
                      >
                        {msg.loading ? <TypingDots /> : msg.content}
                      </div>

                      {msg.actions && msg.actions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {msg.actions.map((action, j) => (
                            <div
                              key={j}
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.04em]"
                              style={{ background: "rgba(47,125,70,0.1)", border: "1px solid rgba(47,125,70,0.3)", color: "#2f7d46" }}
                            >
                              <Check size={10} strokeWidth={3} />
                              {action}
                            </div>
                          ))}
                        </div>
                      )}

                      {msg.isProposal && !msg.loading && (
                        <div className="mt-1 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setMessages((prev) => prev.map((m, idx) => (idx === i ? { ...m, isProposal: false } : m)));
                              send("Yes, confirmed");
                            }}
                            className="rounded-[4px] bg-[var(--accent)] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#ffffff] transition-transform active:scale-95"
                          >
                            Yes, do it
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setMessages((prev) =>
                                prev.map((m, idx) => (idx === i ? { ...m, isProposal: false, content: m.content + "\n\n*(Cancelled)*" } : m))
                              )
                            }
                            className="rounded-[4px] border border-[rgba(197,54,14,0.4)] bg-[rgba(197,54,14,0.08)] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#c5360e] transition-transform active:scale-95"
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
            <div className="px-4 pb-4" style={{ borderTop: messages.length ? "1px solid var(--line)" : undefined, paddingTop: messages.length ? 12 : 0 }}>
              <div className="flex items-end gap-2 rounded-[6px] border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-3">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Block a date, accept a booking, update a price…"
                  disabled={busy}
                  className="flex-1 resize-none bg-transparent text-sm leading-5 text-[var(--ink)] outline-none placeholder:text-[var(--mute)]"
                />
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={!input.trim() || busy}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] transition-transform active:scale-90 disabled:opacity-30"
                  style={{ background: input.trim() && !busy ? "var(--accent)" : "var(--paper-2)" }}
                >
                  <ArrowUp size={14} strokeWidth={2.5} style={{ color: input.trim() && !busy ? "#ffffff" : "var(--mute)" }} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex h-4 items-center gap-1.5 px-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-[5px] w-[5px] rounded-full"
          style={{ background: "var(--accent)" }}
          animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
