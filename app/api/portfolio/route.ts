import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { validatePortfolioUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const hasEditorOrAgency = user.roles.some((r) => r === "editor" || r === "agency");
    if (!hasEditorOrAgency) {
      return NextResponse.json({ error: "Editor or agency role required" }, { status: 403 });
    }

    const body = await request.json();
    if (!body.type || !body.url) {
      return NextResponse.json({ error: "type and url are required" }, { status: 400 });
    }

    const validation = validatePortfolioUrl(body.type, body.url);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }

    const supabase = createClient();

    const { data: existing, error: countError } = await supabase
      .from("portfolio_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const nextOrder = existing ? existing.length : 0;

    const { data: item, error } = await supabase
      .from("portfolio_items")
      .insert({
        user_id: user.id,
        type: body.type,
        url: body.url,
        title: body.title || null,
        display_order: body.display_order ?? nextOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
