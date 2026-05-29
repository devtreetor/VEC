import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: threads, error } = await supabase
      .from("threads")
      .select("*, gig:gig_id(id, title), client:client_id(id, full_name, avatar_url), applicant:applicant_id(id, full_name, avatar_url)")
      .or(`client_id.eq.${user.id},applicant_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const threadIds = threads.map((t) => t.id);
    const lastMessages: Record<string, any> = {};

    if (threadIds.length > 0) {
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .in("thread_id", threadIds)
        .order("sent_at", { ascending: false });

      if (messages) {
        for (const msg of messages) {
          if (!lastMessages[msg.thread_id]) {
            lastMessages[msg.thread_id] = msg;
          }
        }
      }
    }

    const threadsWithLastMessage = threads.map((t) => ({
      ...t,
      last_message: lastMessages[t.id] || null,
    }));

    return NextResponse.json({ threads: threadsWithLastMessage }, { status: 200 });
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

    const body = await request.json();
    if (!body.gig_id || !body.applicant_id) {
      return NextResponse.json({ error: "gig_id and applicant_id are required" }, { status: 400 });
    }

    const supabase = createClient();
    const { data: existing } = await supabase
      .from("threads")
      .select("id")
      .eq("gig_id", body.gig_id)
      .eq("applicant_id", body.applicant_id)
      .single();

    if (existing) {
      return NextResponse.json({ thread: existing }, { status: 200 });
    }

    const { data: thread, error } = await supabase
      .from("threads")
      .insert({
        gig_id: body.gig_id,
        client_id: user.id,
        applicant_id: body.applicant_id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
