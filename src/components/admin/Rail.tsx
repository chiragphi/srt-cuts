"use client";

import { NAV, GROUP_LABELS, type ViewId, type NavItem } from "./nav";

// The operator rail — a persistent left sidebar. A completely different
// navigation skeleton from the customer app (top nav + bottom tabs), so anyone
// glancing at the screen knows instantly they're back-of-house.
export function RailNav({
  active,
  onSelect,
  pendingCount,
}: {
  active: ViewId;
  onSelect: (id: ViewId) => void;
  pendingCount: number;
}) {
  const groups: NavItem["group"][] = ["cockpit", "manage", "ops"];
  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g}>
          <p className="ax-eyebrow" style={{ padding: "0 12px 8px" }}>
            {GROUP_LABELS[g]}
          </p>
          <div className="flex flex-col gap-0.5">
            {NAV.filter((n) => n.group === g).map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="ax-navitem"
                  data-active={isActive}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onSelect(item.id)}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{item.label}</span>
                  {item.id === "bookings" && pendingCount > 0 && (
                    <span
                      className="ax-num"
                      style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        fontWeight: 650,
                        minWidth: 20,
                        textAlign: "center",
                        padding: "2px 6px",
                        borderRadius: 999,
                        background: "var(--a-accent-soft)",
                        color: "var(--a-accent-quiet)",
                      }}
                    >
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

// The operator identity mark that lives at the top of the rail.
export function OperatorMark() {
  return (
    <div className="flex items-center gap-3" style={{ padding: "0 12px" }}>
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          width: 34,
          height: 34,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 10,
          background: "var(--a-accent-strong)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: "-0.02em",
        }}
      >
        S
      </span>
      <div style={{ lineHeight: 1.15 }}>
        <div style={{ fontSize: 14.5, fontWeight: 620, letterSpacing: "-0.01em" }}>SRT</div>
        <div className="ax-eyebrow" style={{ fontSize: 11 }}>
          Operator
        </div>
      </div>
    </div>
  );
}
