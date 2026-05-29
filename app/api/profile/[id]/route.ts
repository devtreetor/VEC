import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", params.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.is_public) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || authUser.id !== params.id) {
        return NextResponse.json({ error: "Profile not public" }, { status: 404 });
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", params.id)
      .single();

    const { data: portfolioItems } = await supabase
      .from("portfolio_items")
      .select("*")
      .eq("user_id", params.id)
      .order("display_order", { ascending: true });

    const { data: agencyMembers } = await supabase
      .from("agency_members")
      .select("*, editor:editor_id(id, full_name, avatar_url)")
      .eq("agency_id", params.id)
      .eq("is_visible", true);

    return NextResponse.json({ user, profile, portfolioItems, agencyMembers }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
