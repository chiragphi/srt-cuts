"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Plus, Trash2, Check, Crosshair } from "lucide-react";
import { focusPosition, type ImageFocus } from "@/lib/site-content";

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <span className="ax-label">{label}</span>
      <input
        className="ax-field"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label style={{ display: "block" }}>
      <span className="ax-label">{label}</span>
      <textarea className="ax-field" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function ImageField({
  label,
  value,
  onChange,
  focus,
  onFocusChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  focus?: ImageFocus;
  onFocusChange?: (f: ImageFocus | undefined) => void;
}) {
  const src = value.trim();
  return (
    <div className="space-y-3">
      <div
        style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 128px", alignItems: "end" }}
      >
        <Field label={label} value={value} onChange={onChange} placeholder="https://…" />
        <div
          style={{
            overflow: "hidden",
            borderRadius: "var(--a-r-sm)",
            border: "1px solid var(--a-line)",
            aspectRatio: "4 / 3",
            position: "relative",
            background: "var(--a-surface-2)",
          }}
        >
          {src ? (
            <Image
              src={src}
              alt={label}
              fill
              sizes="128px"
              style={{ objectFit: "cover", objectPosition: focusPosition(focus) }}
              unoptimized
            />
          ) : (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: "var(--a-text-3)",
              }}
            >
              No image
            </div>
          )}
        </div>
      </div>
      {src && onFocusChange && <FocusPicker key={src} src={src} focus={focus} onChange={onFocusChange} />}
    </div>
  );
}

// Tap (or drag) on the photo to pick the spot that stays visible when the
// storefront crops it. Stored as percentages of the original image.
function FocusPicker({
  src,
  focus,
  onChange,
}: {
  src: string;
  focus?: ImageFocus;
  onChange: (f: ImageFocus | undefined) => void;
}) {
  const [ratio, setRatio] = useState(4 / 3);
  const x = focus?.x ?? 50;
  const y = focus?.y ?? 50;

  function place(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));
    onChange({
      x: clamp(((e.clientX - r.left) / r.width) * 100),
      y: clamp(((e.clientY - r.top) / r.height) * 100),
    });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span className="ax-label" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Crosshair size={13} /> Focus point — tap the part that must stay in view
        </span>
        {focus && (
          <button
            type="button"
            className="ax-btn ax-btn--sm"
            onClick={() => onChange(undefined)}
          >
            Reset to center
          </button>
        )}
      </div>
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 360,
          aspectRatio: String(ratio),
          borderRadius: "var(--a-r-sm)",
          overflow: "hidden",
          border: "1px solid var(--a-line)",
          background: "var(--a-surface-2)",
          cursor: "crosshair",
          touchAction: "none",
          marginTop: 8,
        }}
        onPointerDown={(e) => {
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // Pointer capture is a nice-to-have for dragging; tapping still works.
          }
          place(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons) place(e);
        }}
      >
        <Image
          src={src}
          alt="Focus point"
          fill
          sizes="360px"
          draggable={false}
          style={{ objectFit: "cover", pointerEvents: "none" }}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
          }}
          unoptimized
        />
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            transform: "translate(-50%, -50%)",
            width: 26,
            height: 26,
            borderRadius: "50%",
            border: "2.5px solid #fff",
            boxShadow: "0 0 0 2px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(0,0,0,0.35)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}

export function Repeater<T extends object>({
  items,
  empty,
  onChange,
  render,
  addLabel = "Add item",
}: {
  items: T[];
  empty: T;
  onChange: (items: T[]) => void;
  render: (item: T, update: (item: T) => void) => ReactNode;
  addLabel?: string;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="ax-card ax-card--quiet"
          style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}
        >
          {render(item, (next) => onChange(items.map((row, i) => (i === index ? next : row))))}
          <button
            type="button"
            className="ax-btn ax-btn--sm ax-btn--danger"
            style={{ alignSelf: "flex-start" }}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            <Trash2 size={14} /> Remove
          </button>
        </div>
      ))}
      <button type="button" className="ax-btn" onClick={() => onChange([...items, empty])}>
        <Plus size={16} /> {addLabel}
      </button>
    </div>
  );
}

// Sticky save bar for editor views.
export function SaveBar({
  saving,
  saveMessage,
  onSave,
}: {
  saving: boolean;
  saveMessage: string;
  onSave: () => void;
}) {
  const saved = saveMessage === "Saved.";
  return (
    <div
      className="sticky ax-card"
      style={{
        bottom: 16,
        zIndex: "var(--z-sticky)" as unknown as number,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px 18px",
        background: "color-mix(in srgb, var(--a-surface) 92%, transparent)",
        backdropFilter: "blur(10px)",
        boxShadow: "var(--a-shadow-pop)",
      }}
    >
      <span
        style={{
          fontSize: 13.5,
          fontWeight: 550,
          color: saved ? "var(--s-ok)" : saveMessage ? "var(--s-danger)" : "var(--a-text-3)",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {saved && <Check size={15} />}
        {saveMessage || "Unsaved changes are kept until you save."}
      </span>
      <button type="button" className="ax-btn ax-btn--primary" disabled={saving} onClick={onSave}>
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

// A titled editor block.
export function EditorPanel({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section className="ax-card" style={{ padding: "var(--a-pad)" }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 17, fontWeight: 620, letterSpacing: "-0.01em" }}>{title}</h3>
        {hint && <p style={{ fontSize: 13, color: "var(--a-text-3)", marginTop: 4 }}>{hint}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        borderRadius: "var(--a-r-sm)",
        border: "1px solid var(--a-accent-line)",
        background: "var(--a-accent-soft)",
        padding: "12px 14px",
        fontSize: 13,
        lineHeight: 1.55,
        color: "var(--a-text-2)",
      }}
    >
      {children}
    </div>
  );
}
