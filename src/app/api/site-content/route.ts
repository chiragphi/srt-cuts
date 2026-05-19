import { NextResponse } from "next/server";
import { DEFAULT_SITE_CONTENT, mergeSiteContent } from "@/lib/site-content";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("site_content")
    .select("content")
    .eq("id", "main")
    .maybeSingle();

  if (error) return NextResponse.json({ content: DEFAULT_SITE_CONTENT });

  return NextResponse.json({ content: mergeSiteContent(data?.content) });
}

