"use client";

import { Menu, UserRoundCheck, LogOut } from "lucide-react";

export function TopBar({
  title,
  subtitle,
  onMenu,
  onViewAs,
  onSignOut,
}: {
  title: string;
  subtitle?: string;
  onMenu: () => void;
  onViewAs: () => void;
  onSignOut: () => void;
}) {
  return (
    <header
      className="sticky top-0"
      style={{
        zIndex: "var(--z-sticky)" as unknown as number,
        paddingTop: "env(safe-area-inset-top)",
        background: "color-mix(in srgb, var(--a-bg) 82%, transparent)",
        backdropFilter: "blur(14px) saturate(1.3)",
        borderBottom: "1px solid var(--a-line)",
      }}
    >
      <div
        className="flex items-center gap-3"
        style={{ minHeight: 68, paddingInline: "clamp(16px, 3vw, 30px)" }}
      >
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMenu}
          className="ax-btn ax-btn--sm lg:hidden"
          style={{ padding: 0, width: 40, height: 40, minHeight: 40, flex: "none" }}
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <h1
            className="truncate"
            style={{ fontSize: "clamp(17px, 2.2vw, 21px)", fontWeight: 620, letterSpacing: "-0.02em" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="truncate" style={{ fontSize: 13, color: "var(--a-text-3)", marginTop: 1 }}>
              {subtitle}
            </p>
          )}
        </div>

        <button type="button" onClick={onViewAs} className="ax-btn ax-btn--sm">
          <UserRoundCheck size={16} />
          <span className="hidden sm:inline">View as customer</span>
          <span className="sm:hidden">View as</span>
        </button>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          className="ax-btn ax-btn--sm"
          style={{ padding: 0, width: 40, height: 40, minHeight: 40, flex: "none" }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
