/**
 * Shop-timezone clock math.
 *
 * Booking slots ("9:00 AM" + a DATE column) are wall-clock times at the shop
 * (Herriman, UT). Vercel servers run in UTC, so any "how long until this
 * appointment" comparison must pin the slot to the shop's zone first —
 * `new Date("2026-07-11T14:00:00")` on a UTC server would read a 2 PM cut as
 * 8 AM Mountain and skew every cutoff/reminder by the UTC offset.
 */

export const SHOP_TZ = process.env.SHOP_TZ?.trim() || "America/Denver";

/** Convert a slot label ("9:00 AM") to 24h "HH:MM:SS". */
export function slotTo24h(time: string): string {
  const [raw, period] = time.split(" ");
  const [h, m] = raw.split(":").map(Number);
  const hours = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
  return `${String(hours).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** What time (UTC ms) is `date` + `time24` on the shop's wall clock? */
export function shopTimeToUtcMs(date: string, time24: string): number {
  // Parse as if UTC, then subtract the shop zone's offset at that instant.
  const asUtc = Date.parse(`${date}T${time24}Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(asUtc));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const zonedAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - (zonedAsUtc - asUtc);
}

/** Start of a booking (date + slot label) as UTC ms. */
export function bookingStartUtcMs(date: string, slot: string): number {
  return shopTimeToUtcMs(date, slotTo24h(slot));
}

/** Today's date ("YYYY-MM-DD") on the shop's wall clock. */
export function shopToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TZ, dateStyle: "short" }).format(new Date());
}
