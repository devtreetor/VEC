import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const limit = 10;
    const offset = (page - 1) * limit;

    const user = await getCurrentUser();

    let query = supabase.from("gigs").select("*, client:client_id(id, full_name, avatar_url)", { count: "exact" });

    if (!user) {
      query = query.eq("status", "open").order("created_at", { ascending: true }).limit(5);
    } else {
      query = query.or(`status.eq.open,client_id.eq.${user.id}`).order("created_at", { ascending: false });

      if (type) query = query.eq("gig_type", type);
      if (status) query = query.eq("status", status);

      query = query.range(offset, offset + limit - 1);
    }

    const { data: gigs, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ gigs, count, page, limit }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!user.roles.includes("client")) {
      return NextResponse.json({ error: "Client role required" }, { status: 403 });
    }

    const supabase = createClient();
    const body = await request.json();

    if (!body.title || !body.description || !body.gig_type) {
      return NextResponse.json({ error: "title, description, and gig_type are required" }, { status: 400 });
    }

    if (body.gig_type !== "one_time" && body.gig_type !== "recurring") {
      return NextResponse.json({ error: "gig_type must be one_time or recurring" }, { status: 400 });
    }

    if (user.active_gig_count >= 4) {
      return NextResponse.json(
        { error: "gig_limit_reached", contact: "care.treetor@gmail.com" },
        { status: 403 }
      );
    }

    const { data: gig, error } = await supabase
      .from("gigs")
      .insert({
        client_id: user.id,
        title: body.title,
        description: body.description,
        gig_type: body.gig_type,
        recur_date: body.gig_type === "recurring" ? body.recur_date || null : null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("users").update({ active_gig_count: user.active_gig_count + 1 }).eq("id", user.id);

    return NextResponse.json({ gig }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
