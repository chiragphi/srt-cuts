"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, CheckCircle2, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
  loading?: boolean;
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
        background: "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(255,255,255,0.82))",
        border: "1px solid rgba(118,87,255,0.14)",
        boxShadow: "0 24px 64px rgba(52,43,94,0.1), 0 0 0 1px rgba(255,255,255,0.8) inset",
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 border-b cursor-pointer bg-transparent"
        style={{ borderColor: "rgba(118,87,255,0.1)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 relative"
            style={{
              background: "linear-gradient(135deg, #8f76ff 0%, #6852f5 48%, #3d32c7 100%)",
              boxShadow: "0 6px 20px rgba(96,72,231,0.32)",
            }}
          >
            <Sparkles size={17} className="text-white" />
            <span
              className="absolute inset-0 rounded-2xl animate-pulse"
              style={{ boxShadow: "0 0 0 6px rgba(118,87,255,0.12)" }}
            />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[#17151f] leading-tight">AI Assistant</p>
            <p className="text-[11px] mt-0.5 text-[#9c90b8]">
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
            style={{ color: "rgba(66,56,104,0.35)" }}
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
                  <p className="text-sm text-center text-[#9c90b8]">
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
                          background: "rgba(118,87,255,0.08)",
                          border: "1px solid rgba(118,87,255,0.18)",
                          color: "#4d35d8",
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
                                background: "linear-gradient(135deg, #8f76ff 0%, #6852f5 48%, #3d32c7 100%)",
                                color: "#fff",
                                boxShadow: "0 6px 18px rgba(96,72,231,0.28)",
                              }
                            : {
                                background: "rgba(239,234,255,0.55)",
                                border: "1px solid rgba(118,87,255,0.1)",
                                color: "#2b2638",
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
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div
              className="px-4 pb-4"
              style={{
                borderTop: messages.length ? "1px solid rgba(118,87,255,0.08)" : undefined,
                paddingTop: messages.length ? 12 : 0,
              }}
            >
              <div
                className="flex items-end gap-2 rounded-2xl px-4 py-3"
                style={{
                  background: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(118,87,255,0.16)",
                  boxShadow: "0 2px 12px rgba(52,43,94,0.06)",
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
                  className="flex-1 bg-transparent text-sm outline-none resize-none leading-5 font-sans text-[#17151f] placeholder-[#b0a8c4]"
                />
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={!input.trim() || busy}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90 disabled:opacity-30"
                  style={{
                    background:
                      input.trim() && !busy
                        ? "linear-gradient(135deg, #8f76ff 0%, #6852f5 48%, #3d32c7 100%)"
                        : "rgba(118,87,255,0.1)",
                  }}
                >
                  <ArrowUp
                    size={14}
                    strokeWidth={2.5}
                    style={{ color: input.trim() && !busy ? "#fff" : "#7657ff" }}
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
          style={{ background: "rgba(118,87,255,0.45)" }}
          animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
