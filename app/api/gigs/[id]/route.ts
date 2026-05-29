import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: gig, error } = await supabase
      .from("gigs")
      .select("*, client:client_id(id, full_name, avatar_url, email)")
      .eq("id", params.id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    const user = await getCurrentUser();
    if (gig.status !== "open" && (!user || user.id !== gig.client_id)) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    return NextResponse.json({ gig }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: gig } = await supabase.from("gigs").select("*").eq("id", params.id).single();

    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }
    if (gig.client_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.status) {
      if (!["open", "filled", "closed"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = body.status;
      if (body.status === "filled") {
        updates.filled_at = new Date().toISOString();
      }
    }
    if (body.title) updates.title = body.title;
    if (body.description) updates.description = body.description;
    if (body.recur_date !== undefined) updates.recur_date = body.recur_date;

    const { data: updated, error } = await supabase
      .from("gigs")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ gig: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: gig } = await supabase.from("gigs").select("*").eq("id", params.id).single();

    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }
    if (gig.client_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { error } = await supabase.from("gigs").delete().eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (user.active_gig_count > 0) {
      await supabase.from("users").update({ active_gig_count: user.active_gig_count - 1 }).eq("id", user.id);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
