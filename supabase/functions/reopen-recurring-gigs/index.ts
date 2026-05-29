import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

interface Application {
  id: string;
  gig_id: string;
  applicant_id: string;
}

interface Gig {
  id: string;
  title: string;
  client_id: string;
  recur_date: string;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const siteUrl = Deno.env.get("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000";

    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendApiKey);

    const today = new Date().toISOString().split("T")[0];

    const { data: gigs, error: gigError } = await supabase
      .from("gigs")
      .select("*")
      .eq("gig_type", "recurring")
      .eq("status", "filled")
      .eq("recur_date", today);

    if (gigError) {
      console.error("Error fetching gigs:", gigError);
      return new Response(JSON.stringify({ error: gigError.message }), { status: 500 });
    }

    if (!gigs || gigs.length === 0) {
      return new Response(JSON.stringify({ message: "No gigs to reopen today" }), { status: 200 });
    }

    const results: Array<{ gig_id: string; status: string; applicants_notified: number }> = [];

    for (const gig of gigs as Gig[]) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      if (gig.updated_at > oneHourAgo) {
        console.log(`Skipping gig ${gig.id} - recently updated (idempotency check)`);
        results.push({ gig_id: gig.id, status: "skipped", applicants_notified: 0 });
        continue;
      }

      const { error: updateError } = await supabase
        .from("gigs")
        .update({
          status: "open",
          filled_at: null,
          applicant_count: 0,
        })
        .eq("id", gig.id);

      if (updateError) {
        console.error(`Error reopening gig ${gig.id}:`, updateError);
        results.push({ gig_id: gig.id, status: "error", applicants_notified: 0 });
        continue;
      }

      const { data: applications, error: appError } = await supabase
        .from("applications")
        .select("applicant_id")
        .eq("gig_id", gig.id)
        .eq("is_withdrawn", false);

      if (appError) {
        console.error(`Error fetching applications for gig ${gig.id}:`, appError);
        results.push({ gig_id: gig.id, status: "reopened", applicants_notified: 0 });
        continue;
      }

      let notified = 0;
      const applicantIds = [...new Set((applications || []).map((a: Application) => a.applicant_id))];

      for (const applicantId of applicantIds) {
        const { data: applicant } = await supabase
          .from("users")
          .select("email, id")
          .eq("id", applicantId)
          .single();

        if (!applicant) continue;

        await supabase.from("notifications").insert({
          user_id: applicant.id,
          type: "gig_reopen",
          title: "Gig Reopened",
          body: `"${gig.title}" has been reopened for applications`,
          link: `/gigs/${gig.id}`,
        });

        try {
          await resend.emails.send({
            from: "Video Editing Connect <notifications@treetor.com>",
            to: applicant.email,
            subject: `"${gig.title}" has been reopened`,
            html: `
              <p>The gig <strong>${gig.title}</strong> you previously applied to has been reopened for new applications.</p>
              <p><a href="${siteUrl}/gigs/${gig.id}">View Gig</a></p>
            `,
          });
          notified++;
        } catch (emailError) {
          console.error(`Failed to send email to ${applicant.email}:`, emailError);
        }
      }

      results.push({ gig_id: gig.id, status: "reopened", applicants_notified: notified });
    }

    return new Response(JSON.stringify({ processed: gigs.length, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
