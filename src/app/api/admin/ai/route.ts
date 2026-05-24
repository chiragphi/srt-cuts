import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { mergeSiteContent } from "@/lib/site-content";
import { sendSMS, SMS } from "@/lib/twilio";
import { TIME_SLOTS, DAYS_OF_WEEK } from "@/lib/schedule";

const MODEL = "llama-3.3-70b-versatile";

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

const TOOLS = [
  {
    type: "function",
    function: {
      name: "block_date",
      description: "Block a date so customers cannot book on it. Use for days off, vacation, fully booked days, etc.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          reason: { type: "string", description: "Short reason, e.g. 'Day off', 'Vacation', 'Booked'" },
        },
        required: ["date", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "unblock_date",
      description: "Remove a block from a date, making it bookable again.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
        },
        required: ["date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "accept_booking",
      description: "Accept a pending booking. This sends an SMS confirmation to the customer.",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "The full booking ID (UUID)" },
        },
        required: ["booking_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deny_booking",
      description: "Deny a pending booking. This sends an SMS to the customer.",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "The full booking ID (UUID)" },
        },
        required: ["booking_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_service",
      description: "Update a service's price, duration, or description.",
      parameters: {
        type: "object",
        properties: {
          service_name: {
            type: "string",
            description: "Service name — one of: Fade, Haircut, Lineup, Full Service, Kids Cut",
          },
          price_cents: {
            type: "number",
            description: "New price in cents (e.g. 3500 = $35.00). Omit to keep current price.",
          },
          duration: {
            type: "string",
            description: "Duration string, e.g. '45 min'. Omit to keep current.",
          },
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
      description: "Update a text field on the website (bio, policies, loyalty offer, etc.)",
      parameters: {
        type: "object",
        properties: {
          field: {
            type: "string",
            enum: [
              "barberName",
              "barberBio",
              "cancellationPolicy",
              "reminderPolicy",
              "loyaltyOffer",
              "referralOffer",
              "depositNote",
              "address",
              "parkingNote",
            ],
            description: "The content field to update",
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
      name: "set_availability",
      description:
        "Set the available booking time slots for a day of the week. Customers can only book times you explicitly enable here. Pass an empty array to clear all slots for that day.",
      parameters: {
        type: "object",
        properties: {
          day: {
            type: "string",
            enum: ["0", "1", "2", "3", "4", "5", "6"],
            description:
              "Day of week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday",
          },
          times: {
            type: "array",
            items: { type: "string" },
            description:
              `Array of time strings from the allowed set: ${TIME_SLOTS.join(", ")}. Pass empty array [] to close the day entirely.`,
          },
        },
        required: ["day", "times"],
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
    supabaseAdmin
      .from("bookings")
      .select("*")
      .order("booking_date", { ascending: true }),
    supabaseAdmin
      .from("site_content")
      .select("content")
      .eq("id", "main")
      .maybeSingle(),
  ]);

  const bookings = (bookingRes.data ?? []) as Booking[];
  const content = mergeSiteContent(contentRes.data?.content);

  const today = new Date().toISOString().split("T")[0];
  const pending = bookings.filter((b) => b.status === "pending");

  const systemPrompt = `You are the AI assistant for SRT Cuts, a private barbershop run by ${content.barberName} in Herriman, Utah.

You help the admin manage their business. Be direct and concise. After using a tool, confirm briefly what you did (no need to explain how).

TODAY: ${today}

PENDING BOOKINGS (${pending.length}):
${
  pending.length
    ? pending
        .map(
          (b) =>
            `- ID: ${b.id} | ${b.user_name} | ${b.service} | ${b.booking_date} at ${b.booking_time}`
        )
        .join("\n")
    : "None"
}

ALL BOOKINGS (recent):
${bookings
  .slice(-8)
  .map(
    (b) =>
      `- ID: ${b.id} | ${b.user_name} | ${b.service} | ${b.booking_date} | ${b.status}`
  )
  .join("\n")}

BLOCKED DATES:
${
  content.scheduleBlocks.length
    ? content.scheduleBlocks.map((b) => `- ${b.date}: ${b.reason}`).join("\n")
    : "None"
}

SERVICES:
${content.serviceConfigs
  .map((s) => `- ${s.name}: $${(s.amount / 100).toFixed(2)} (${s.duration})`)
  .join("\n")}

WEEKLY AVAILABILITY (times customers can book — empty = day is closed):
${DAYS_OF_WEEK.map((day, i) => {
  const slots = content.weeklyAvailability[String(i)] ?? [];
  return `- ${day}: ${slots.length ? slots.join(", ") : "CLOSED"}`;
}).join("\n")}

VALID TIME SLOTS: ${TIME_SLOTS.join(", ")}

When parsing dates like "tomorrow", "next Monday", "this Friday" — always calculate relative to TODAY (${today}).
If you need to perform multiple actions (e.g. accept all pending bookings, or set availability for multiple days), call the tools multiple times in one response.`;

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
      reply: assistantMsg.content ?? "Done.",
      actionsPerformed: [],
      hasActions: false,
    });
  }

  // Execute tools and collect results
  const toolResults: { role: string; tool_call_id: string; content: string }[] = [];
  const actionsPerformed: string[] = [];

  for (const call of assistantMsg.tool_calls) {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(call.function.arguments);
    } catch {
      // ignore parse errors
    }

    const result = await executeTool(call.function.name, args, bookings, content);
    actionsPerformed.push(result.description);
    toolResults.push({
      role: "tool",
      tool_call_id: call.id,
      content: JSON.stringify({ success: result.success, result: result.description }),
    });
  }

  // Second call for final text response — cast assistantMsg to include tool_calls for the messages array
  const finalMessages = [
    ...messages,
    assistantMsg as unknown,
    ...toolResults,
  ];
  const finalRes = await groqCall(finalMessages);
  const reply =
    "error" in finalRes
      ? "Done."
      : (finalRes.choices[0].message.content ?? "Done.");

  return NextResponse.json({ reply, actionsPerformed, hasActions: actionsPerformed.length > 0 });
}

interface GroqResponse {
  choices: {
    message: {
      content: string | null;
      tool_calls?: { id: string; function: { name: string; arguments: string } }[];
    };
  }[];
}

interface GroqError {
  error: true;
}

async function groqCall(
  messages: unknown[],
  tools?: unknown[]
): Promise<GroqResponse | GroqError> {
  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    max_tokens: 1024,
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

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  bookings: Booking[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _content: ReturnType<typeof mergeSiteContent>
): Promise<{ success: boolean; description: string }> {
  if (name === "block_date") {
    const date = args.date as string;
    const reason = args.reason as string;

    const { data: row } = await supabaseAdmin
      .from("site_content")
      .select("content")
      .eq("id", "main")
      .maybeSingle();
    const content = mergeSiteContent(row?.content);

    const blocks = content.scheduleBlocks.filter((b) => b.date !== date);
    blocks.push({ date, reason });
    blocks.sort((a, b) => a.date.localeCompare(b.date));

    await supabaseAdmin
      .from("site_content")
      .upsert({ id: "main", content: { ...content, scheduleBlocks: blocks }, updated_at: new Date().toISOString() });

    return { success: true, description: `Blocked ${date} — ${reason}` };
  }

  if (name === "unblock_date") {
    const date = args.date as string;

    const { data: row } = await supabaseAdmin
      .from("site_content")
      .select("content")
      .eq("id", "main")
      .maybeSingle();
    const content = mergeSiteContent(row?.content);

    const blocks = content.scheduleBlocks.filter((b) => b.date !== date);
    await supabaseAdmin
      .from("site_content")
      .upsert({ id: "main", content: { ...content, scheduleBlocks: blocks }, updated_at: new Date().toISOString() });

    return { success: true, description: `Unblocked ${date}` };
  }

  if (name === "accept_booking" || name === "deny_booking") {
    const bookingId = args.booking_id as string;
    const status = name === "accept_booking" ? "accepted" : "denied";

    const booking = bookings.find((b) => b.id === bookingId);

    await supabaseAdmin.from("bookings").update({ status }).eq("id", bookingId);

    if (booking) {
      const displayDate = new Date(booking.booking_date + "T00:00:00").toLocaleDateString(
        "en-US",
        { weekday: "long", month: "long", day: "numeric" }
      );
      try {
        const msg =
          status === "accepted"
            ? SMS.bookingAccepted(booking.user_name, booking.service, displayDate, booking.booking_time)
            : SMS.bookingDenied(booking.user_name, booking.service, displayDate, booking.booking_time);
        await sendSMS(booking.user_phone, msg);
      } catch (err) {
        console.error("AI agent SMS failed:", err instanceof Error ? err.message : err);
      }
    }

    const name2 = booking?.user_name ?? bookingId.slice(0, 8);
    return {
      success: true,
      description: `${status === "accepted" ? "Accepted" : "Denied"} booking for ${name2}`,
    };
  }

  if (name === "update_service") {
    const serviceName = (args.service_name as string).toLowerCase();
    const priceCents = args.price_cents as number | undefined;
    const duration = args.duration as string | undefined;
    const desc = args.desc as string | undefined;

    const { data: row } = await supabaseAdmin
      .from("site_content")
      .select("content")
      .eq("id", "main")
      .maybeSingle();
    const content = mergeSiteContent(row?.content);

    const updated = content.serviceConfigs.map((s) => {
      if (s.name.toLowerCase() !== serviceName) return s;
      return {
        ...s,
        ...(priceCents !== undefined ? { amount: Math.round(priceCents) } : {}),
        ...(duration !== undefined ? { duration } : {}),
        ...(desc !== undefined ? { desc } : {}),
      };
    });

    await supabaseAdmin
      .from("site_content")
      .upsert({ id: "main", content: { ...content, serviceConfigs: updated }, updated_at: new Date().toISOString() });

    const changes: string[] = [];
    if (priceCents !== undefined) changes.push(`$${(priceCents / 100).toFixed(2)}`);
    if (duration) changes.push(duration);
    return { success: true, description: `Updated ${args.service_name}${changes.length ? ` → ${changes.join(", ")}` : ""}` };
  }

  if (name === "update_content") {
    const field = args.field as string;
    const value = args.value as string;

    const { data: row } = await supabaseAdmin
      .from("site_content")
      .select("content")
      .eq("id", "main")
      .maybeSingle();
    const content = mergeSiteContent(row?.content);

    await supabaseAdmin
      .from("site_content")
      .upsert({ id: "main", content: { ...content, [field]: value }, updated_at: new Date().toISOString() });

    return { success: true, description: `Updated ${field}` };
  }

  if (name === "set_availability") {
    const dow = args.day as string;
    const times = (args.times as string[]).filter((t) => TIME_SLOTS.includes(t));
    times.sort((a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b));

    const { data: row } = await supabaseAdmin
      .from("site_content")
      .select("content")
      .eq("id", "main")
      .maybeSingle();
    const content = mergeSiteContent(row?.content);

    const weeklyAvailability = { ...content.weeklyAvailability, [dow]: times };
    await supabaseAdmin
      .from("site_content")
      .upsert({ id: "main", content: { ...content, weeklyAvailability }, updated_at: new Date().toISOString() });

    const dayName = DAYS_OF_WEEK[parseInt(dow)];
    const desc =
      times.length === 0
        ? `Cleared all slots for ${dayName}`
        : `Set ${dayName} availability: ${times.length} slot${times.length !== 1 ? "s" : ""} (${times[0]}–${times[times.length - 1]})`;
    return { success: true, description: desc };
  }

  return { success: false, description: `Unknown tool: ${name}` };
}
