// Small formatting helpers for the cockpit. Money is cents in, string out.

export function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(cents) % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function moneyCompact(cents: number): string {
  const dollars = cents / 100;
  if (Math.abs(dollars) >= 1000) {
    return "$" + new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(dollars / 1000) + "k";
  }
  return money(cents);
}

export function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function signedPct(delta: number | null): { text: string; tone: "up" | "down" | "flat" } {
  if (delta === null) return { text: "new", tone: "flat" };
  if (delta === 0) return { text: "0%", tone: "flat" };
  const tone = delta > 0 ? "up" : "down";
  return { text: `${delta > 0 ? "+" : ""}${Math.round(delta * 100)}%`, tone };
}

export function shortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function longDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function relativeDays(days: number | null): string {
  if (days === null) return "—";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}
