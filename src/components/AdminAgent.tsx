"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, CheckCircle2, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
  loading?: boolean;
  isProposal?: boolean;
}

const SUGGESTIONS = [
  "Block tomorrow",
  "Accept all pending bookings",
  "What days are blocked?",
  "Raise the Fade price to $35",
];

export default function AdminAgent({ onRefresh }: { onRefresh: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    const history = messages
      .filter((m) => !m.loading)
      .map((m) => ({ role: m.role, content: m.content }));

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
    <div
      className="mb-6 sm:mb-8 rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.018)), #100f0d",
        border: "1px solid rgba(212,160,23,0.16)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset",
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 border-b cursor-pointer bg-transparent"
        style={{ borderColor: "rgba(212,160,23,0.12)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 relative"
            style={{
              background: "linear-gradient(135deg, #f0cd66 0%, #d4a017 52%, #b5841f 100%)",
              boxShadow: "0 6px 20px rgba(212,160,23,0.3)",
            }}
          >
            <Sparkles size={17} className="text-white" />
            <span
              className="absolute inset-0 rounded-2xl animate-pulse"
              style={{ boxShadow: "0 0 0 6px rgba(212,160,23,0.12)" }}
            />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[#f5f0e6] leading-tight">AI Assistant</p>
            <p className="text-[11px] mt-0.5 text-[#8c857a]">
              Powered by Groq · llama-3.3-70b
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-medium text-emerald-600">Live</span>
          </div>
          <motion.svg
            animate={{ rotate: open ? 0 : -90 }}
            transition={{ duration: 0.2 }}
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            style={{ color: "rgba(245,240,230,0.4)" }}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
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
            <div
              ref={scrollRef}
              className="px-5 py-4 space-y-3 overflow-y-auto"
              style={{ maxHeight: 320, minHeight: isEmpty ? 112 : undefined }}
            >
              {isEmpty ? (
                <div className="flex flex-col items-center justify-center py-2 gap-4">
                  <p className="text-sm text-center text-[#8c857a]">
                    Tell me what to do — block dates, accept bookings, update prices.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="text-xs px-3 py-1.5 rounded-full transition-all duration-150 active:scale-95 bg-transparent"
                        style={{
                          background: "rgba(212,160,23,0.1)",
                          border: "1px solid rgba(212,160,23,0.22)",
                          color: "#e8b84b",
                        }}
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
                        className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                        style={
                          msg.role === "user"
                            ? {
                                background: "linear-gradient(135deg, #f0cd66 0%, #d4a017 52%, #b5841f 100%)",
                                color: "#fff",
                                boxShadow: "0 6px 18px rgba(212,160,23,0.28)",
                              }
                            : {
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.09)",
                                color: "#f5f0e6",
                              }
                        }
                      >
                        {msg.loading ? <TypingDots /> : msg.content}
                      </div>

                      {msg.actions && msg.actions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {msg.actions.map((action, j) => (
                            <div
                              key={j}
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                              style={{
                                background: "rgba(22,163,74,0.08)",
                                border: "1px solid rgba(22,163,74,0.2)",
                                color: "#16a34a",
                              }}
                            >
                              <CheckCircle2 size={10} strokeWidth={2.5} />
                              {action}
                            </div>
                          ))}
                        </div>
                      )}

                      {msg.isProposal && !msg.loading && (
                        <div className="flex gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setMessages((prev) =>
                                prev.map((m, idx) => idx === i ? { ...m, isProposal: false } : m)
                              );
                              send("Yes, confirmed");
                            }}
                            className="text-xs font-semibold px-4 py-2 rounded-xl active:scale-95 transition-all duration-150"
                            style={{
                              background: "linear-gradient(135deg, #f0cd66 0%, #d4a017 52%, #b5841f 100%)",
                              color: "#fff",
                              boxShadow: "0 4px 12px rgba(212,160,23,0.28)",
                            }}
                          >
                            Yes, do it
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setMessages((prev) =>
                                prev.map((m, idx) =>
                                  idx === i ? { ...m, isProposal: false, content: m.content + "\n\n*(Cancelled)*" } : m
                                )
                              )
                            }
                            className="text-xs font-semibold px-4 py-2 rounded-xl active:scale-95 transition-all duration-150"
                            style={{
                              background: "rgba(239,68,68,0.08)",
                              border: "1px solid rgba(239,68,68,0.2)",
                              color: "#dc2626",
                            }}
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
            <div
              className="px-4 pb-4"
              style={{
                borderTop: messages.length ? "1px solid rgba(212,160,23,0.1)" : undefined,
                paddingTop: messages.length ? 12 : 0,
              }}
            >
              <div
                className="flex items-end gap-2 rounded-2xl px-4 py-3"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(212,160,23,0.18)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                }}
              >
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Block a date, accept a booking, update a price…"
                  disabled={busy}
                  className="flex-1 bg-transparent text-sm outline-none resize-none leading-5 font-sans text-[#f5f0e6] placeholder-[#8c857a]"
                />
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={!input.trim() || busy}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90 disabled:opacity-30"
                  style={{
                    background:
                      input.trim() && !busy
                        ? "linear-gradient(135deg, #f0cd66 0%, #d4a017 52%, #b5841f 100%)"
                        : "rgba(212,160,23,0.12)",
                  }}
                >
                  <ArrowUp
                    size={14}
                    strokeWidth={2.5}
                    style={{ color: input.trim() && !busy ? "#1c1402" : "#e8b84b" }}
                  />
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
    <div className="flex items-center gap-1.5 h-4 px-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-[5px] h-[5px] rounded-full"
          style={{ background: "rgba(212,160,23,0.5)" }}
          animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
