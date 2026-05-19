import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { DEFAULT_SITE_CONTENT, mergeSiteContent, type SiteContent } from "@/lib/site-content";
import { supabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const user = await getSession();
  return Boolean(user && isAdmin(user.phone));
}

export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("site_content")
    .select("content")
    .eq("id", "main")
    .maybeSingle();

  if (error) return NextResponse.json({ content: DEFAULT_SITE_CONTENT });

  return NextResponse.json({ content: mergeSiteContent(data?.content) });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as Partial<SiteContent>;
  const content = mergeSiteContent(body);
  const { error } = await supabaseAdmin
    .from("site_content")
    .upsert({ id: "main", content, updated_at: new Date().toISOString() });

  if (error) {
    return NextResponse.json(
      { error: "Create the site_content table from supabase-schema.sql, then save again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ content });
}

