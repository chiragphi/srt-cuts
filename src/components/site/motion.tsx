"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Scroll-entrance reveal for the storefront. Content is visible by default (the
// element renders, then enhances) — compositor-only (opacity + translateY),
// reduced-motion handled in site.css.
export default function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Component = Tag as "div";
  return (
    <Component
      ref={ref as React.Ref<HTMLDivElement>}
      className={`cx-reveal ${className}`}
      data-show={show}
      style={{ ["--cx-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Component>
  );
}
