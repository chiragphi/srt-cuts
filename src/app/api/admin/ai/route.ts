import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { mergeSiteContent } from "@/lib/site-content";
import { notifyPhone } from "@/lib/sms-client";
import { SMS } from "@/lib/sms-messages";
import { TIME_SLOTS, DAYS_OF_WEEK } from "@/lib/schedule";
import { clampDiscount, effectivePrice } from "@/lib/services";

export const runtime = "nodejs";

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
      name: "close_all_availability",
      description:
        "Close ALL availability at once — sets every day of the week to no slots and removes all date-specific overrides. " +
        "Use when asked to 'close everything', 'remove all slots', 'clear all availability', etc.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_date_overrides",
      description:
        "Remove date-specific availability overrides for one or more dates, reverting those dates back to the weekly schedule. " +
        "Different from closing — this restores the recurring weekly pattern for those dates.",
      parameters: {
        type: "object",
        properties: {
          dates: {
            type: "array",
            items: { type: "string" },
            description: "Dates in YYYY-MM-DD format to revert to weekly defaults.",
          },
        },
        required: ["dates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_action",
      description:
        "Use this ONLY when a request is genuinely ambiguous — multiple reasonable interpretations exist. " +
        "Describe exactly what you plan to do and ask for confirmation. " +
        "Do NOT use this for clear requests — just execute those directly.",
      parameters: {
        type: "object",
        properties: {
          interpretation: {
            type: "string",
            description: "Plain-English description of what you understood and what you would do. Be specific: include dates, times, day names.",
          },
        },
        required: ["interpretation"],
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
          discount_percent: {
            type: "number",
            description: "Site-wide discount on this service, 0–90 (%). 0 removes the sale. Omit to keep current.",
          },
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
  {
    type: "function",
    function: {
      name: "set_discount",
      description:
        "Apply a site-wide percentage discount to one or more services (or all of them). The sale shows on the website and the customer is charged the reduced price. Use percent=0 to remove a sale.",
      parameters: {
        type: "object",
        properties: {
          services: {
            type: "array",
            items: { type: "string", enum: ["Fade", "Haircut", "Lineup", "Full Service", "Kids Cut", "all"] },
            description: "Service names to discount, or [\"all\"] for every service.",
          },
          percent: { type: "number", description: "Discount percentage 0–90. 0 removes the discount." },
        },
        required: ["services", "percent"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_discounts",
      description:
        "Remove site-wide discounts. Omit services (or pass [\"all\"]) to end every sale; pass specific names to clear just those.",
      parameters: {
        type: "object",
        properties: {
          services: {
            type: "array",
            items: { type: "string", enum: ["Fade", "Haircut", "Lineup", "Full Service", "Kids Cut", "all"] },
            description: "Services to clear, or omit / [\"all\"] for every service.",
          },
        },
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
  let proposalInterpretation: string | null = null;

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

    if (call.function.name === "propose_action") {
      proposalInterpretation = (args.interpretation as string) ?? "I can help with that.";
      toolResults.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify({ success: true, result: "Proposal sent to admin." }),
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

  // If this is a proposal, skip the second LLM call — the interpretation IS the reply
  if (proposalInterpretation !== null) {
    return NextResponse.json({
      reply: `Here's what I think you're trying to do: ${proposalInterpretation}\n\nIs that right?`,
      actionsPerformed: [],
      hasActions: false,
      isProposal: true,
    });
  }

  // Final conversational response
  const finalMessages = [...messages, assistantMsg as unknown, ...toolResults];
  const finalRes = await groqCall(finalMessages);
  const reply = "error" in finalRes
    ? actionsPerformed.join("; ")
    : (finalRes.choices[0].message.content ?? actionsPerformed.join("; "));

  return NextResponse.json({ reply, actionsPerformed, hasActions: actionsPerformed.length > 0, isProposal: false });
}

function buildSystemPrompt(
  content: SiteContentState,
  bookings: Booking[],
  pending: Booking[],
  today: string
): string {
  // Pre-compute the next 18 days with their day names and current availability status
  const upcomingDates: { iso: string; dayName: string; dow: number; status: string }[] = [];
  for (let i = 1; i <= 18; i++) {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    const dow = d.getDay();
    const dayName = DAYS_OF_WEEK[dow];
    const override = content.dateAvailability[iso];
    const weekly = content.weeklyAvailability[String(dow)] ?? [];
    let status: string;
    if (override !== undefined) {
      status = override.length ? `override ${override[0]}–${override[override.length - 1]}` : "override: CLOSED";
    } else {
      status = weekly.length ? `weekly: ${weekly[0]}–${weekly[weekly.length - 1]}` : "weekly: CLOSED";
    }
    upcomingDates.push({ iso, dayName, dow, status });
  }

  // Group upcoming dates by day-of-week for easy "every Thursday" lookup
  const byDow: Record<string, string[]> = {};
  upcomingDates.forEach(({ iso, dow }) => {
    const key = String(dow);
    if (!byDow[key]) byDow[key] = [];
    byDow[key].push(iso);
  });
  const dowSummaryLines = DAYS_OF_WEEK.map((name, i) => {
    const dates = byDow[String(i)] ?? [];
    return dates.length ? `- ${name}: ${dates.join(", ")}` : null;
  }).filter(Boolean);

  const weeklyLines = DAYS_OF_WEEK.map((day, i) => {
    const slots = content.weeklyAvailability[String(i)] ?? [];
    return `- ${day} (index ${i}): ${slots.length ? `${slots[0]}–${slots[slots.length - 1]} (${slots.length} slots)` : "CLOSED"}`;
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
- If the current state already matches what the admin wants, say so without calling tools.

## EXECUTE vs PROPOSE
EXECUTE immediately (no confirmation) when the request is clear:
  - Specific day(s) + specific time → just do it
  - "Accept all pending", "close everything", "block [date]" → just do it
  - Any request with only one reasonable interpretation → just do it

CALL propose_action (ask for confirmation) when genuinely ambiguous:
  - "open up some time this week" — which days? what hours?
  - "open Thursdays" — recurring weekly pattern OR just the upcoming Thursday dates?
  - Multiple valid interpretations exist

When you call propose_action, describe EXACTLY what you plan to do in the interpretation field.
After the user confirms ("yes", "yeah", "do it", "correct", etc.), execute the tools immediately.

## HOW TO USE TOOLS

OPENING slots (examples):
  ✓ "Open Mon/Wed/Fri/Sat 9am–5pm" → set_weekly_availability({ days: ["1","3","5","6"], from_time: "9:00 AM", to_time: "5:00 PM" })
  ✓ "Open just 3pm on specific dates" → set_date_availability({ dates: ["2026-05-29","2026-06-05"], from_time: "3:00 PM", to_time: "3:00 PM" })
  ✓ "Open every Thursday in the schedule" → look up all Thursday dates in UPCOMING DATES section below, then call set_date_availability with ALL of them at once
  ✗ Do NOT make multiple calls when one batch call will do

CLOSING/REMOVING slots:
  ✓ "Close all availability" / "clear everything" → close_all_availability (no args)
  ✓ "Close Monday" → set_weekly_availability({ days: ["1"], close: true })
  ✓ "Close Mon and Wed" → set_weekly_availability({ days: ["1","3"], close: true })
  ✓ "Close this specific date" → set_date_availability({ dates: ["YYYY-MM-DD"], close: true })
  ✓ "Revert date back to weekly default" → remove_date_overrides({ dates: ["YYYY-MM-DD"] })
  ✗ NEVER pass from_time/to_time when closing — only use close: true

A SINGLE TIME SLOT: from_time and to_time can be the SAME value.
  ✓ "Open only 3pm" → from_time: "3:00 PM", to_time: "3:00 PM"

BOOKING ACTIONS:
  ✓ "Accept all pending" → accept_all_pending (no args)
  ✓ "Raise all prices" → call update_service once per service

DISCOUNTS (site-wide sales — reduce what the customer is charged):
  ✓ "20% off the fade" → set_discount({ services: ["Fade"], percent: 20 })
  ✓ "Put 15% off everything" → set_discount({ services: ["all"], percent: 15 })
  ✓ "Half off lineups and kids cuts" → set_discount({ services: ["Lineup","Kids Cut"], percent: 50 })
  ✓ "End the sale" / "remove all discounts" → clear_discounts({})
  ✓ "Remove the fade discount" → clear_discounts({ services: ["Fade"] })

TIME FORMAT: Values MUST exactly match the valid slots list. "9:00 AM" not "9am".

## DAY NUMBERS
0=Sunday 1=Monday 2=Tuesday 3=Wednesday 4=Thursday 5=Friday 6=Saturday
Shortcuts: weekdays=[1,2,3,4,5]  weekends=[0,6]  every day=[0,1,2,3,4,5,6]

## UPCOMING 18 DATES — exact calendar (use these ISO dates for set_date_availability):
${upcomingDates.map(({ iso, dayName }) => `- ${iso} (${dayName.slice(0, 3)})`).join("  ")}

## UPCOMING DATES GROUPED BY WEEKDAY (ready to copy into dates[] array):
${dowSummaryLines.join("\n")}

## PENDING BOOKINGS (${pending.length}) — use full IDs:
${pending.length ? pending.map((b) => `- ID: ${b.id} | ${b.user_name} | ${b.service} | ${b.booking_date} at ${b.booking_time}`).join("\n") : "None"}

## ALL BOOKINGS (recent):
${bookings.slice(-10).map((b) => `- ID: ${b.id} | ${b.user_name} | ${b.service} | ${b.booking_date} | ${b.status}`).join("\n")}

## BLOCKED DATES:
${content.scheduleBlocks.length ? content.scheduleBlocks.map((b) => `- ${b.date}: ${b.reason}`).join("\n") : "None"}

## SERVICES (price · discount):
${content.serviceConfigs
  .map((s) => {
    const pct = clampDiscount(s.discountPercent);
    const sale = pct > 0 ? ` — ${pct}% OFF → $${(effectivePrice(s) / 100).toFixed(2)}` : " — no discount";
    return `- ${s.name}: $${(s.amount / 100).toFixed(2)}, ${s.duration}${sale}`;
  })
  .join("\n")}

## WEEKLY AVAILABILITY (recurring schedule):
${weeklyLines.join("\n")}

## DATE-SPECIFIC OVERRIDES (override weekly for these dates):
${dateOverrideLines.length ? dateOverrideLines.join("\n") : "None"}

## VALID TIME SLOTS:
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
    const discountPercent = args.discount_percent as number | undefined;

    const serviceConfigs = content.serviceConfigs.map((s) => {
      if (s.name.toLowerCase() !== serviceName) return s;
      return {
        ...s,
        ...(priceCents !== undefined ? { amount: Math.round(priceCents) } : {}),
        ...(duration !== undefined ? { duration } : {}),
        ...(desc !== undefined ? { desc } : {}),
        ...(discountPercent !== undefined ? { discountPercent: clampDiscount(discountPercent) } : {}),
      };
    });

    const updatedContent = { ...content, serviceConfigs };
    const changes: string[] = [];
    if (priceCents !== undefined) changes.push(`$${(priceCents / 100).toFixed(2)}`);
    if (duration) changes.push(duration);
    if (discountPercent !== undefined) {
      const pct = clampDiscount(discountPercent);
      changes.push(pct > 0 ? `${pct}% off` : "no discount");
    }
    return {
      success: true,
      description: `Updated ${args.service_name}${changes.length ? ` → ${changes.join(", ")}` : ""}`,
      updatedContent,
    };
  }

  if (name === "set_discount" || name === "clear_discounts") {
    const isClear = name === "clear_discounts";
    const targets = resolveServiceTargets(args.services, content);
    if (!targets.length) return { success: false, description: "No matching services." };
    const percent = isClear ? 0 : clampDiscount(Number(args.percent));

    const serviceConfigs = content.serviceConfigs.map((s) =>
      targets.includes(s.name) ? { ...s, discountPercent: percent } : s
    );
    const updatedContent = { ...content, serviceConfigs };
    const description = percent > 0
      ? `${percent}% off ${targets.join(", ")} (site-wide)`
      : `Removed discount from ${targets.join(", ")}`;
    return { success: true, description, updatedContent };
  }

  if (name === "update_content") {
    const field = args.field as string;
    const value = args.value as string;
    const updatedContent = { ...content, [field]: value };
    return { success: true, description: `Updated ${field}`, updatedContent };
  }

  if (name === "close_all_availability") {
    const weeklyAvailability: Record<string, string[]> = {};
    DAYS_OF_WEEK.forEach((_, i) => { weeklyAvailability[String(i)] = []; });
    const updatedContent = { ...content, weeklyAvailability, dateAvailability: {} };
    const openDays = DAYS_OF_WEEK.filter((_, i) => (content.weeklyAvailability[String(i)] ?? []).length > 0);
    const overrideCount = Object.keys(content.dateAvailability).length;
    const parts: string[] = [];
    if (openDays.length) parts.push(`closed weekly schedule for ${openDays.join(", ")}`);
    if (overrideCount) parts.push(`cleared ${overrideCount} date override${overrideCount !== 1 ? "s" : ""}`);
    const desc = parts.length ? `Removed all availability: ${parts.join("; ")}` : "All availability was already closed.";
    return { success: true, description: desc, updatedContent };
  }

  if (name === "remove_date_overrides") {
    const dates = (args.dates as string[] | undefined) ?? [];
    if (!dates.length) return { success: false, description: "No dates provided." };
    const dateAvailability = { ...content.dateAvailability };
    const removed: string[] = [];
    dates.forEach((d) => {
      if (d in dateAvailability) {
        delete dateAvailability[d];
        removed.push(new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
      }
    });
    if (!removed.length) return { success: true, description: "No overrides found for those dates — nothing changed." };
    const updatedContent = { ...content, dateAvailability };
    return { success: true, description: `Removed date overrides for: ${removed.join(", ")} (now use weekly defaults)`, updatedContent };
  }

  // ── Booking actions (write directly — affect bookings table, not site_content) ──

  if (name === "accept_all_pending") {
    const pendingBookings = bookings.filter((b) => b.status === "pending");
    if (!pendingBookings.length) return { success: true, description: "No pending bookings to accept." };

    const results: string[] = [];
    for (const booking of pendingBookings) {
      await supabaseAdmin.from("bookings").update({ status: "accepted" }).eq("id", booking.id);
      const displayDate = new Date(booking.booking_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      if (content.smsPrefs.customerBookingTexts)
        await notifyPhone(booking.user_phone, SMS.bookingAccepted(booking.user_name, booking.service, displayDate, booking.booking_time, content.address));
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
    const msg = status === "accepted"
      ? SMS.bookingAccepted(booking.user_name, booking.service, displayDate, booking.booking_time, content.address)
      : SMS.bookingDenied(booking.user_name, booking.service, displayDate, booking.booking_time);
    if (content.smsPrefs.customerBookingTexts) await notifyPhone(booking.user_phone, msg);

    return { success: true, description: `${status === "accepted" ? "Accepted" : "Denied"} booking for ${booking.user_name}` };
  }

  return { success: false, description: `Unknown tool: ${name}` };
}

function resolveServiceTargets(input: unknown, content: SiteContentState): string[] {
  const names = content.serviceConfigs.map((s) => s.name);
  if (!Array.isArray(input) || input.length === 0) return [...names];
  const lower = input.map((x) => String(x).trim().toLowerCase());
  if (lower.includes("all")) return [...names];
  return names.filter((n) => lower.includes(n.toLowerCase()));
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
