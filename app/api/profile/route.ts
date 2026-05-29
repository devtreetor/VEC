import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { calculateProfileCompletion } from "@/lib/utils";

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = createClient();
    const body = await request.json();

    const profileUpdates: Record<string, any> = {};
    const userUpdates: Record<string, any> = {};

    if (body.bio !== undefined) profileUpdates.bio = body.bio;
    if (body.website_url !== undefined) profileUpdates.website_url = body.website_url;
    if (body.location !== undefined) profileUpdates.location = body.location;
    if (body.social_links !== undefined) profileUpdates.social_links = body.social_links;
    if (body.is_public !== undefined) userUpdates.is_public = body.is_public;

    if (Object.keys(profileUpdates).length > 0) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existingProfile) {
        const { error } = await supabase
          .from("profiles")
          .update(profileUpdates)
          .eq("user_id", user.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        const { error } = await supabase
          .from("profiles")
          .insert({ user_id: user.id, ...profileUpdates });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (Object.keys(userUpdates).length > 0) {
      const { error } = await supabase
        .from("users")
        .update(userUpdates)
        .eq("id", user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: updatedUser } = await supabase.from("users").select("*").eq("id", user.id).single();
    const { data: updatedProfile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    const { data: portfolioItems } = await supabase.from("portfolio_items").select("type").eq("user_id", user.id);

    if (updatedUser) {
      const pct = calculateProfileCompletion(
        { ...updatedUser, ...updatedProfile, social_links: updatedProfile?.social_links || {} },
        portfolioItems || []
      );
      await supabase.from("users").update({ profile_completion_pct: pct }).eq("id", user.id);
    }

    return NextResponse.json({ user: updatedUser, profile: updatedProfile }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
