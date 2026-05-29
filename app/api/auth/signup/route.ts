import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, roles } = body;

    if (!email || !password || !roles || !Array.isArray(roles) || roles.length === 0) {
      return NextResponse.json({ error: "email, password, and roles are required" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { roles },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 429 });
    }

    if (authData.user) {
      const { error: dbError } = await supabaseAdmin.from("users").insert({
        id: authData.user.id,
        email: authData.user.email!,
        roles,
      });

      if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }
    }

    const supabase = createClient();
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return NextResponse.json({ error: signInError.message }, { status: 500 });
    }

    return NextResponse.json({
      user: authData.user,
      session: sessionData?.session || null,
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
