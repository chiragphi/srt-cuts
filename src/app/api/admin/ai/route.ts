import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { mergeSiteContent } from "@/lib/site-content";
import { sendSMS, SMS } from "@/lib/twilio";
import { TIME_SLOTS, DAYS_OF_WEEK } from "@/lib/schedule";

const MODEL = "llama-3.3-70b-versatile";

type SiteContentState = ReturnType<typeof mergeSiteContent>;

interface Booking {
  id: string;
  user_name: string;
  user_phone: string;
  service: string;
  booking_date: string;
  booking_time: string;
  status: "pending" | "accepted" | "denied";
  service_price_cents: number;
  payment_method: "in_store" | "online";
  payment_status: string;
  notes: string;
}

const DAY_MAP: Record<string, string> = {
  sunday: "0", monday: "1", tuesday: "2", wednesday: "3",
  thursday: "4", friday: "5", saturday: "6",
  sun: "0", mon: "1", tue: "2", wed: "3", thu: "4", fri: "5", sat: "6",
};

const TOOLS = [
  {
    type: "function",
    function: {
      name: "set_weekly_availability",
      description:
        "Set recurring weekly availability for one OR multiple days in a single call. " +
        "Pass ALL days you want to change in the 'days' array. " +
        "Example: to open Mon/Wed/Fri/Sat 9am–5pm, pass days=[\"1\",\"3\",\"5\",\"6\"], from_time=\"9:00 AM\", to_time=\"5:00 PM\". " +
        "To close a day, include it in days[] and set close=true.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "array",
            items: { type: "string", enum: ["0", "1", "2", "3", "4", "5", "6"] },
            description: "Days to update: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat. Include ALL days in one array.",
          },
          from_time: {
            type: "string",
            description: `Start of open window. Must be an exact value from: ${TIME_SLOTS.join(", ")}`,
          },
          to_time: {
            type: "string",
            description: `End of open window (inclusive). Must be an exact value from: ${TIME_SLOTS.join(", ")}`,
          },
          close: {
            type: "boolean",
            description: "Set true to close these days entirely. Overrides from_time/to_time.",
          },
        },
        required: ["days"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_date_availability",
      description:
        "Override availability for one OR multiple specific dates in a single call. " +
        "Date-specific overrides take priority over the weekly schedule. " +
        "Example: to open May 26 and May 27 from 10am–3pm, pass dates=[\"2026-05-26\",\"2026-05-27\"], from_time=\"10:00 AM\", to_time=\"3:00 PM\".",
      parameters: {
        type: "object",
        properties: {
          dates: {
            type: "array",
            items: { type: "string" },
            description: "Dates in YYYY-MM-DD format. Include ALL dates in one array.",
          },
          from_time: {
            type: "string",
            description: `Start of open window. Must be an exact value from: ${TIME_SLOTS.join(", ")}`,
          },
          to_time: {
            type: "string",
            description: `End of open window (inclusive). Must be an exact value from: ${TIME_SLOTS.join(", ")}`,
          },
          close: {
            type: "boolean",
            description: "Set true to close these dates entirely.",
          },
        },
        required: ["dates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "block_dates",
      description: "Block one or more dates so customers cannot book them. Blocked dates override availability.",
      parameters: {
        type: "object",
        properties: {
          dates: {
            type: "array",
            items: { type: "string" },
            description: "Dates to block in YYYY-MM-DD format.",
          },
          reason: { type: "string", description: "Short reason shown in admin, e.g. 'Day off', 'Vacation'" },
        },
        required: ["dates", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "unblock_dates",
      description: "Remove blocks from one or more dates, making them bookable again.",
      parameters: {
        type: "object",
        properties: {
          dates: {
            type: "array",
            items: { type: "string" },
            description: "Dates to unblock in YYYY-MM-DD format.",
          },
        },
        required: ["dates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "accept_booking",
      description: "Accept a specific pending booking and send SMS confirmation to the customer.",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "Full UUID of the booking" },
        },
        required: ["booking_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deny_booking",
      description: "Deny a specific pending booking and send SMS to the customer.",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "Full UUID of the booking" },
        },
        required: ["booking_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "accept_all_pending",
      description: "Accept ALL pending bookings at once and send SMS confirmation to each customer. Use this when asked to accept everything.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_service",
      description: "Update a service's price, duration, or description. Call once per service.",
      parameters: {
        type: "object",
        properties: {
          service_name: {
            type: "string",
            description: "Exact service name: Fade, Haircut, Lineup, Full Service, or Kids Cut",
          },
          price_cents: {
            type: "number",
            description: "New price in cents (e.g. 3500 = $35.00). Omit to keep current.",
          },
          duration: { type: "string", description: "Duration string, e.g. '45 min'. Omit to keep current." },
          desc: { type: "string", description: "Short description. Omit to keep current." },
        },
        required: ["service_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_content",
      description: "Update a text field on the website.",
      parameters: {
        type: "object",
        properties: {
          field: {
            type: "string",
            enum: ["barberName", "barberBio", "cancellationPolicy", "reminderPolicy", "loyaltyOffer", "referralOffer", "depositNote", "address", "parkingNote"],
            description: "The field to update",
          },
          value: { type: "string", description: "The new value" },
        },
        required: ["field", "value"],
      },
    },
  },
];

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || !isAdmin(user.phone))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { message, history = [] } = (await req.json()) as {
    message: string;
    history: { role: string; content: string }[];
  };

  const [bookingRes, contentRes] = await Promise.all([
    supabaseAdmin.from("bookings").select("*").order("booking_date", { ascending: true }),
    supabaseAdmin.from("site_content").select("content").eq("id", "main").maybeSingle(),
  ]);

  const bookings = (bookingRes.data ?? []) as Booking[];
  const content = mergeSiteContent(contentRes.data?.content);

  const today = new Date().toISOString().split("T")[0];
  const pending = bookings.filter((b) => b.status === "pending");

  const systemPrompt = buildSystemPrompt(content, bookings, pending, today);

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-12),
    { role: "user", content: message },
  ];

  const firstRes = await groqCall(messages, TOOLS);
  if ("error" in firstRes) {
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }

  const assistantMsg = firstRes.choices[0].message;

  if (!assistantMsg.tool_calls?.length) {
    return NextResponse.json({
      reply: assistantMsg.content ?? "Let me know if there's anything else I can help with.",
      actionsPerformed: [],
      hasActions: false,
    });
  }

  // Execute all tools — content-modifying tools share a single in-memory state
  // to avoid DB read-after-write races. One upsert at the end.
  const toolResults: { role: string; tool_call_id: string; content: string }[] = [];
  const actionsPerformed: string[] = [];
  let currentContent = content;
  let contentDirty = false;

  for (const call of assistantMsg.tool_calls) {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(call.function.arguments);
    } catch {
      actionsPerformed.push(`Parse error on ${call.function.name}`);
      toolResults.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify({ success: false, result: "Could not parse tool arguments — JSON was malformed." }),
      });
      continue;
    }

    const result = await executeTool(call.function.name, args, bookings, currentContent);
    actionsPerformed.push(result.description);

    if (result.updatedContent) {
      currentContent = result.updatedContent;
      contentDirty = true;
    }

    toolResults.push({
      role: "tool",
      tool_call_id: call.id,
      content: JSON.stringify({ success: result.success, result: result.description }),
    });
  }

  // Single atomic write for all content changes
  if (contentDirty) {
    await supabaseAdmin
      .from("site_content")
      .upsert({ id: "main", content: currentContent, updated_at: new Date().toISOString() });
  }

  // Final conversational response
  const finalMessages = [...messages, assistantMsg as unknown, ...toolResults];
  const finalRes = await groqCall(finalMessages);
  const reply = "error" in finalRes
    ? actionsPerformed.join("; ")
    : (finalRes.choices[0].message.content ?? actionsPerformed.join("; "));

  return NextResponse.json({ reply, actionsPerformed, hasActions: actionsPerformed.length > 0 });
}

function buildSystemPrompt(
  content: SiteContentState,
  bookings: Booking[],
  pending: Booking[],
  today: string
): string {
  const weeklyLines = DAYS_OF_WEEK.map((day, i) => {
    const slots = content.weeklyAvailability[String(i)] ?? [];
    return `- ${day} (${i}): ${slots.length ? `${slots[0]}–${slots[slots.length - 1]} (${slots.length} slots)` : "CLOSED"}`;
  });

  const dateOverrideLines = Object.entries(content.dateAvailability)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, times]) =>
      `- ${date}: ${times.length ? `${times[0]}–${times[times.length - 1]} (${times.length} slots)` : "CLOSED"}`
    );

  return `You are the AI assistant for SRT Cuts barbershop. You have full control over everything: availability, bookings, services, content, blocked dates.

TODAY: ${today}

## HOW TO RESPOND
- Be warm, specific, and helpful. Never say just "Done." Summarize exactly what changed.
- If a request is ambiguous (e.g. "make tomorrow available" — what hours?), ask ONE clarifying question BEFORE calling any tools.
- If the current state already matches what the admin wants, say so without calling tools.

## HOW TO USE TOOLS
- set_weekly_availability and set_date_availability accept ARRAYS — put ALL days/dates in one call.
  ✓ CORRECT: set_weekly_availability({ days: ["1","3","5","6"], from_time: "9:00 AM", to_time: "5:00 PM" })
  ✗ WRONG: calling set_weekly_availability 4 separate times for Mon/Wed/Fri/Sat
- "Accept all pending" → use accept_all_pending (one call, no args)
- "Raise all prices" → call update_service once per service
- Time values MUST exactly match the valid slots list. Use "9:00 AM" not "9am" or "9:00am".

## DAY NUMBER REFERENCE
0=Sunday 1=Monday 2=Tuesday 3=Wednesday 4=Thursday 5=Friday 6=Saturday
Shortcuts: "weekdays" = [1,2,3,4,5], "weekends" = [0,6], "every day" = [0,1,2,3,4,5,6]

## DATE CALCULATION
Relative to TODAY (${today}). "Tomorrow" = ${addDays(today, 1)}.
"Next Monday" = find the next Monday strictly after today.
Use set_weekly_availability for recurring patterns. Use set_date_availability for specific one-off dates.
Note: blocked dates always take priority — customers can never book a blocked date.

## PENDING BOOKINGS (${pending.length}) — use full IDs for accept/deny:
${pending.length ? pending.map((b) => `- ID: ${b.id} | ${b.user_name} | ${b.service} | ${b.booking_date} at ${b.booking_time}`).join("\n") : "None"}

## ALL BOOKINGS (recent):
${bookings.slice(-10).map((b) => `- ID: ${b.id} | ${b.user_name} | ${b.service} | ${b.booking_date} | ${b.status}`).join("\n")}

## BLOCKED DATES:
${content.scheduleBlocks.length ? content.scheduleBlocks.map((b) => `- ${b.date}: ${b.reason}`).join("\n") : "None"}

## SERVICES:
${content.serviceConfigs.map((s) => `- ${s.name}: $${(s.amount / 100).toFixed(2)}, ${s.duration}`).join("\n")}

## WEEKLY AVAILABILITY (number in parens = day index to pass in days[]):
${weeklyLines.join("\n")}

## DATE-SPECIFIC OVERRIDES:
${dateOverrideLines.length ? dateOverrideLines.join("\n") : "None"}

## VALID TIME SLOTS (use these exact strings only):
${TIME_SLOTS.join(", ")}`;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

interface GroqResponse {
  choices: {
    message: {
      content: string | null;
      tool_calls?: { id: string; function: { name: string; arguments: string } }[];
    };
  }[];
}

interface GroqError { error: true; }

async function groqCall(messages: unknown[], tools?: unknown[]): Promise<GroqResponse | GroqError> {
  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    max_tokens: tools?.length ? 4096 : 1024,
  };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("Groq error:", await res.text());
    return { error: true };
  }

  return res.json() as Promise<GroqResponse>;
}

function normalizeTimeString(t: string): string {
  const clean = t.trim().replace(/\s+/g, " ");
  // Already valid
  if (TIME_SLOTS.includes(clean)) return clean;
  // Parse "9am", "9:30PM", "9 AM", "noon", "12pm"
  if (/^noon$/i.test(clean)) return "12:00 PM";
  if (/^midnight$/i.test(clean)) return "12:00 AM";
  const m = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (m) {
    const hour = m[1];
    const min = m[2] ?? "00";
    const period = m[3].toUpperCase();
    const candidate = `${hour}:${min} ${period}`;
    if (TIME_SLOTS.includes(candidate)) return candidate;
  }
  return clean;
}

function resolveSlots(args: Record<string, unknown>): string[] | { error: string } {
  if (args.close) return [];
  const fromRaw = args.from_time as string | undefined;
  const toRaw = args.to_time as string | undefined;

  if (fromRaw && toRaw) {
    const from = normalizeTimeString(fromRaw);
    const to = normalizeTimeString(toRaw);
    const fromIdx = TIME_SLOTS.indexOf(from);
    const toIdx = TIME_SLOTS.indexOf(to);
    if (fromIdx === -1) return { error: `"${fromRaw}" is not a valid time slot.` };
    if (toIdx === -1) return { error: `"${toRaw}" is not a valid time slot.` };
    if (toIdx < fromIdx) return { error: `to_time "${toRaw}" is before from_time "${fromRaw}".` };
    return TIME_SLOTS.slice(fromIdx, toIdx + 1);
  }

  // Fallback: model sent a full times array
  if (Array.isArray(args.times)) {
    return (args.times as string[]).filter((t) => TIME_SLOTS.includes(normalizeTimeString(t)));
  }

  return { error: "Must provide from_time and to_time (or close=true)." };
}

interface ToolExecResult {
  success: boolean;
  description: string;
  updatedContent?: SiteContentState;
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  bookings: Booking[],
  content: SiteContentState
): Promise<ToolExecResult> {

  // ── Availability (batch, in-memory mutations) ──────────────────────────────

  if (name === "set_weekly_availability") {
    const days = normalizeDays(args.days);
    if (!days.length) return { success: false, description: "No valid days provided." };
    const slots = resolveSlots(args);
    if ("error" in slots) return { success: false, description: slots.error };

    const weeklyAvailability = { ...content.weeklyAvailability };
    days.forEach((d) => { weeklyAvailability[d] = slots; });

    const updatedContent = { ...content, weeklyAvailability };
    const dayNames = days.map((d) => DAYS_OF_WEEK[parseInt(d)]).join(", ");
    const desc = slots.length === 0
      ? `Closed: ${dayNames}`
      : `${dayNames}: ${slots[0]}–${slots[slots.length - 1]} (${slots.length} slots each)`;
    return { success: true, description: desc, updatedContent };
  }

  if (name === "set_date_availability") {
    const dates = (args.dates as string[] | undefined) ?? [];
    if (!dates.length) return { success: false, description: "No dates provided." };
    const slots = resolveSlots(args);
    if ("error" in slots) return { success: false, description: slots.error };

    const dateAvailability = { ...content.dateAvailability };
    dates.forEach((d) => { dateAvailability[d] = slots; });

    const updatedContent = { ...content, dateAvailability };
    const labels = dates.map((d) =>
      new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    ).join(", ");
    const desc = slots.length === 0
      ? `Closed: ${labels}`
      : `${labels}: ${slots[0]}–${slots[slots.length - 1]} (${slots.length} slots)`;
    return { success: true, description: desc, updatedContent };
  }

  if (name === "block_dates") {
    const dates = (args.dates as string[] | undefined) ?? [];
    const reason = (args.reason as string) ?? "Unavailable";
    if (!dates.length) return { success: false, description: "No dates provided." };

    const blocks = content.scheduleBlocks.filter((b) => !dates.includes(b.date));
    dates.forEach((d) => blocks.push({ date: d, reason }));
    blocks.sort((a, b) => a.date.localeCompare(b.date));

    const updatedContent = { ...content, scheduleBlocks: blocks };
    return { success: true, description: `Blocked: ${dates.join(", ")} (${reason})`, updatedContent };
  }

  if (name === "unblock_dates") {
    const dates = (args.dates as string[] | undefined) ?? [];
    if (!dates.length) return { success: false, description: "No dates provided." };

    const blocks = content.scheduleBlocks.filter((b) => !dates.includes(b.date));
    const updatedContent = { ...content, scheduleBlocks: blocks };
    return { success: true, description: `Unblocked: ${dates.join(", ")}`, updatedContent };
  }

  if (name === "update_service") {
    const serviceName = (args.service_name as string).toLowerCase();
    const priceCents = args.price_cents as number | undefined;
    const duration = args.duration as string | undefined;
    const desc = args.desc as string | undefined;

    const serviceConfigs = content.serviceConfigs.map((s) => {
      if (s.name.toLowerCase() !== serviceName) return s;
      return {
        ...s,
        ...(priceCents !== undefined ? { amount: Math.round(priceCents) } : {}),
        ...(duration !== undefined ? { duration } : {}),
        ...(desc !== undefined ? { desc } : {}),
      };
    });

    const updatedContent = { ...content, serviceConfigs };
    const changes: string[] = [];
    if (priceCents !== undefined) changes.push(`$${(priceCents / 100).toFixed(2)}`);
    if (duration) changes.push(duration);
    return {
      success: true,
      description: `Updated ${args.service_name}${changes.length ? ` → ${changes.join(", ")}` : ""}`,
      updatedContent,
    };
  }

  if (name === "update_content") {
    const field = args.field as string;
    const value = args.value as string;
    const updatedContent = { ...content, [field]: value };
    return { success: true, description: `Updated ${field}`, updatedContent };
  }

  // ── Booking actions (write directly — affect bookings table, not site_content) ──

  if (name === "accept_all_pending") {
    const pendingBookings = bookings.filter((b) => b.status === "pending");
    if (!pendingBookings.length) return { success: true, description: "No pending bookings to accept." };

    const results: string[] = [];
    for (const booking of pendingBookings) {
      await supabaseAdmin.from("bookings").update({ status: "accepted" }).eq("id", booking.id);
      const displayDate = new Date(booking.booking_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      try {
        await sendSMS(booking.user_phone, SMS.bookingAccepted(booking.user_name, booking.service, displayDate, booking.booking_time));
      } catch (err) {
        console.error("SMS failed for", booking.id, err instanceof Error ? err.message : err);
      }
      results.push(booking.user_name);
    }
    return { success: true, description: `Accepted ${results.length} booking${results.length !== 1 ? "s" : ""}: ${results.join(", ")}` };
  }

  if (name === "accept_booking" || name === "deny_booking") {
    const bookingId = args.booking_id as string;
    const status = name === "accept_booking" ? "accepted" : "denied";
    const booking = bookings.find((b) => b.id === bookingId);

    if (!booking) return { success: false, description: `Booking ${bookingId.slice(0, 8)} not found.` };
    if (booking.status !== "pending") return { success: false, description: `${booking.user_name}'s booking is already ${booking.status}.` };

    await supabaseAdmin.from("bookings").update({ status }).eq("id", bookingId);

    const displayDate = new Date(booking.booking_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    try {
      const msg = status === "accepted"
        ? SMS.bookingAccepted(booking.user_name, booking.service, displayDate, booking.booking_time)
        : SMS.bookingDenied(booking.user_name, booking.service, displayDate, booking.booking_time);
      await sendSMS(booking.user_phone, msg);
    } catch (err) {
      console.error("AI SMS failed:", err instanceof Error ? err.message : err);
    }

    return { success: true, description: `${status === "accepted" ? "Accepted" : "Denied"} booking for ${booking.user_name}` };
  }

  return { success: false, description: `Unknown tool: ${name}` };
}

function normalizeDays(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((d) => {
      const s = String(d).trim().toLowerCase();
      if (/^[0-6]$/.test(s)) return s;
      return DAY_MAP[s] ?? null;
    })
    .filter((d): d is string => d !== null);
}
