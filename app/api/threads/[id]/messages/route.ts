import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { notifyNewMessage } from "@/lib/notifications";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: thread } = await supabase
      .from("threads")
      .select("*")
      .eq("id", params.id)
      .single();

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    if (thread.client_id !== user.id && thread.applicant_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = 50;

    let query = supabase
      .from("messages")
      .select("*, sender:sender_id(id, full_name, avatar_url)")
      .eq("thread_id", params.id)
      .order("sent_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("sent_at", cursor);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: (messages || []).reverse(), hasMore: (messages || []).length === limit }, { status: 200 });
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

    const supabase = createClient();
    const { data: thread } = await supabase
      .from("threads")
      .select("*, client:client_id(email, full_name), applicant:applicant_id(email, full_name)")
      .eq("id", params.id)
      .single();

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    if (thread.client_id !== user.id && thread.applicant_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await request.json();
    if (!body.body || !body.body.trim()) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        thread_id: params.id,
        sender_id: user.id,
        body: body.body,
      })
      .select("*, sender:sender_id(id, full_name, avatar_url)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase
      .from("threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", params.id);

    const recipientId = thread.client_id === user.id ? thread.applicant_id : thread.client_id;
    const recipientEmail = thread.client_id === user.id ? thread.applicant.email : thread.client.email;

    await notifyNewMessage(recipientEmail, recipientId, params.id, user.full_name || "Someone");

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
