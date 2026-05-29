import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { notifyNewApplication } from "@/lib/notifications";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: gig } = await supabase.from("gigs").select("client_id").eq("id", params.id).single();

    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }
    if (gig.client_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data: applications, error } = await supabase
      .from("applications")
      .select("*, applicant:applicant_id(id, full_name, avatar_url, email, roles)")
      .eq("gig_id", params.id)
      .eq("is_withdrawn", false)
      .order("applied_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ applications }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const hasEditorOrAgency = user.roles.some((r) => r === "editor" || r === "agency");
    if (!hasEditorOrAgency) {
      return NextResponse.json({ error: "Editor or agency role required" }, { status: 403 });
    }

    if (user.profile_completion_pct < 50) {
      return NextResponse.json(
        { error: "Profile completion must be at least 50% to apply. Complete your profile first." },
        { status: 403 }
      );
    }

    const supabase = createClient();
    const { data: gig } = await supabase.from("gigs").select("*, client:client_id(*)").eq("id", params.id).single();

    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }
    if (gig.status !== "open") {
      return NextResponse.json({ error: "Gig is not accepting applications" }, { status: 400 });
    }
    if (gig.client_id === user.id) {
      return NextResponse.json({ error: "Cannot apply to your own gig" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("gig_id", params.id)
      .eq("applicant_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Already applied to this gig" }, { status: 409 });
    }

    const body = await request.json();
    const { data: application, error } = await supabase
      .from("applications")
      .insert({
        gig_id: params.id,
        applicant_id: user.id,
        cover_note: body.cover_note || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("gigs").update({ applicant_count: gig.applicant_count + 1 }).eq("id", params.id);

    await notifyNewApplication(gig.title, gig.client.email, gig.client.id, params.id);

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
