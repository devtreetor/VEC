import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { notifyShortlisted, notifyHired } from "@/lib/notifications";

export async function PATCH(request: NextRequest, { params }: { params: { id: string; appId: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: gig } = await supabase.from("gigs").select("client_id, title").eq("id", params.id).single();

    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    const body = await request.json();
    const isClient = gig.client_id === user.id;
    const isApplicant = !isClient;

    if (isClient) {
      if (!body.stage) {
        return NextResponse.json({ error: "stage is required" }, { status: 400 });
      }
      if (!["shortlisted", "interviewing", "hired"].includes(body.stage)) {
        return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
      }

      const { data: application, error: fetchError } = await supabase
        .from("applications")
        .select("*, applicant:applicant_id(email)")
        .eq("id", params.appId)
        .eq("gig_id", params.id)
        .single();

      if (fetchError || !application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      const { data: updated, error } = await supabase
        .from("applications")
        .update({ stage: body.stage })
        .eq("id", params.appId)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (body.stage === "shortlisted") {
        await notifyShortlisted(gig.title, application.applicant.email, application.applicant_id, params.id);
      } else if (body.stage === "hired") {
        await notifyHired(gig.title, application.applicant.email, application.applicant_id, params.id);
        await supabase.from("gigs").update({ status: "filled", filled_at: new Date().toISOString() }).eq("id", params.id);
      }

      return NextResponse.json({ application: updated }, { status: 200 });
    }

    if (isApplicant) {
      const { data: application } = await supabase
        .from("applications")
        .select("*")
        .eq("id", params.appId)
        .eq("applicant_id", user.id)
        .single();

      if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      const { error } = await supabase
        .from("applications")
        .update({ is_withdrawn: true })
        .eq("id", params.appId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const { data: currentGig } = await supabase
        .from("gigs")
        .select("applicant_count")
        .eq("id", params.id)
        .single();

      const newCount = Math.max(0, (currentGig?.applicant_count || 1) - 1);
      await supabase.from("gigs").update({ applicant_count: newCount }).eq("id", params.id);

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; appId: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: application } = await supabase
      .from("applications")
      .select("*, gig:gig_id(applicant_count)")
      .eq("id", params.appId)
      .eq("applicant_id", user.id)
      .single();

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("applications")
      .update({ is_withdrawn: true })
      .eq("id", params.appId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const newCount = Math.max(0, (application.gig?.applicant_count || 1) - 1);
    await supabase.from("gigs").update({ applicant_count: newCount }).eq("id", params.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
