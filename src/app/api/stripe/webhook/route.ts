import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyStripeSignature } from "@/lib/stripe";

interface StripeCheckoutCompleted {
  type: string;
  data: {
    object: {
      id: string;
      payment_status?: string;
      metadata?: { booking_id?: string };
      client_reference_id?: string;
      payment_intent?: string;
      amount_total?: number;
    };
  };
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const headerStore = await headers();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret)
    return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 });

  if (!verifyStripeSignature(payload, headerStore.get("stripe-signature"), webhookSecret))
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  const event = JSON.parse(payload) as StripeCheckoutCompleted;
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata?.booking_id ?? session.client_reference_id;
    if (bookingId && session.payment_status === "paid") {
      await supabaseAdmin
        .from("bookings")
        .update({
          payment_status: "paid",
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        })
        .eq("id", bookingId);
    }
  }

  return NextResponse.json({ received: true });
}

