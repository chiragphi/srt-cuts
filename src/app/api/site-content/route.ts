import { NextResponse } from "next/server";
import { mergeSiteContent, type SiteContent } from "@/lib/site-content";
import { supabaseAdmin } from "@/lib/supabase";

// The street address is private — it's texted after a booking is confirmed,
// so it must never leave through this public endpoint.
function publicContent(content: SiteContent): Omit<SiteContent, "address"> {
  const rest: Partial<SiteContent> = { ...content };
  delete rest.address;
  return rest as Omit<SiteContent, "address">;
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("site_content")
    .select("content")
    .eq("id", "main")
    .maybeSingle();

  return NextResponse.json({ content: publicContent(mergeSiteContent(error ? null : data?.content)) });
}

