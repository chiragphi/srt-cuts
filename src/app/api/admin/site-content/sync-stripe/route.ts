import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { mergeSiteContent } from "@/lib/site-content";
import { archiveStripePrice, createStripePrice, createStripeProduct, getStripePrice, updateStripeProduct } from "@/lib/stripe";

function serviceLookupKey(name: string) {
  return `srt_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
}

export async function POST() {
  const user = await getSession();
  if (!user || !isAdmin(user.phone))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data } = await supabaseAdmin
    .from("site_content")
    .select("content")
    .eq("id", "main")
    .maybeSingle();

  const content = mergeSiteContent(data?.content);

  try {
    const serviceConfigs = await Promise.all(
      content.serviceConfigs.map(async (service) => {
        const product = service.stripeProductId
          ? await updateStripeProduct(service.stripeProductId, service.name)
          : await createStripeProduct(service.name);

        if (service.stripePriceId) {
          const currentPrice = await getStripePrice(service.stripePriceId).catch(() => null);
          if (currentPrice?.unit_amount === service.amount) {
            return { ...service, stripeProductId: product.id, stripePriceId: currentPrice.id };
          }
          await archiveStripePrice(service.stripePriceId).catch(() => {});
        }

        const price = await createStripePrice(product.id, service.amount, serviceLookupKey(service.name));
        return { ...service, stripeProductId: product.id, stripePriceId: price.id };
      })
    );

    const nextContent = { ...content, serviceConfigs };
    const { error } = await supabaseAdmin
      .from("site_content")
      .upsert({ id: "main", content: nextContent, updated_at: new Date().toISOString() });

    if (error) throw new Error(error.message);
    return NextResponse.json({ content: nextContent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe sync failed" },
      { status: 500 }
    );
  }
}
