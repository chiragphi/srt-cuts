"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, AlertTriangle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const ICONS = {
  success: Check,
  error: AlertTriangle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed left-1/2 top-[max(18px,env(safe-area-inset-top))] z-[9999] flex w-full max-w-[420px] -translate-x-1/2 flex-col gap-2 px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto flex items-start gap-3 rounded-[4px] border border-[var(--line-ink)] bg-[var(--ink)] px-4 py-3.5 text-[var(--paper)] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.6)]"
              >
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px]"
                  style={{
                    background: t.type === "error" ? "#e5484d" : t.type === "success" ? "#4ad07a" : "#f4f1e8",
                    color: "#16140f",
                  }}
                >
                  <Icon size={13} strokeWidth={3} />
                </span>
                <p className="flex-1 text-sm leading-snug">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 text-[var(--mute-ink)] transition-colors hover:text-[var(--paper)]"
                  aria-label="Dismiss notification"
                >
                  <X size={15} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
