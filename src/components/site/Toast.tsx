"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, TriangleAlert, Info } from "lucide-react";

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

const ICONS = { success: Check, error: TriangleAlert, info: Info };
// Literal colors: this container mounts at the root layout, outside `.site`,
// so it can't rely on the storefront's `--c-*` custom properties.
const TONES: Record<ToastType, string> = {
  success: "#1f9457",
  error: "#cf3f34",
  info: "#6a4bff",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        style={{
          position: "fixed",
          left: "50%",
          top: "max(18px, env(safe-area-inset-top))",
          transform: "translateX(-50%)",
          zIndex: 9999,
          width: "100%",
          maxWidth: 420,
          padding: "0 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  pointerEvents: "auto",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(24,18,44,0.09)",
                  background: "#ffffff",
                  padding: "13px 15px",
                  color: "#191721",
                  boxShadow: "0 2px 6px rgba(24,18,44,0.05), 0 26px 60px -30px rgba(24,18,44,0.4)",
                  fontFamily: "var(--font-instrument), system-ui, sans-serif",
                }}
              >
                <span
                  style={{
                    marginTop: 1,
                    display: "inline-flex",
                    height: 20,
                    width: 20,
                    flex: "none",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    background: TONES[t.type],
                    color: "#fff",
                  }}
                >
                  <Icon size={12} strokeWidth={3} />
                </span>
                <p style={{ flex: 1, fontSize: 14, lineHeight: 1.45 }}>{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  style={{ flex: "none", color: "#837f8e", background: "none", border: 0, cursor: "pointer" }}
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
