import { createClient } from "./supabase-server";
import { resend } from "./resend";

interface NotificationInput {
  userId: string;
  type: "application" | "shortlist" | "message" | "hired" | "gig_reopen";
  title: string;
  body?: string;
  link?: string;
}

export async function createNotification(input: NotificationInput) {
  const supabase = createClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body || null,
    link: input.link || null,
  });
  if (error) console.error("Failed to create notification:", error);
}

interface EmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(input: EmailInput) {
  if (!resend) return;
  try {
    await resend.emails.send({
      from: "Video Editing Connect <notifications@treetor.com>",
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

const debounceMap = new Map<string, number>();

export function shouldSendEmail(key: string, minIntervalMs = 300000): boolean {
  const last = debounceMap.get(key);
  const now = Date.now();
  if (last && now - last < minIntervalMs) return false;
  debounceMap.set(key, now);
  return true;
}

export async function notifyNewApplication(gigTitle: string, clientEmail: string, clientId: string, gigId: string) {
  await createNotification({
    userId: clientId,
    type: "application",
    title: "New Application Received",
    body: `Someone applied to your gig "${gigTitle}"`,
    link: `/gigs/manage/${gigId}`,
  });
  await sendEmail({
    to: clientEmail,
    subject: `New application for "${gigTitle}"`,
    html: `<p>You received a new application for your gig <strong>${gigTitle}</strong>.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/gigs/manage/${gigId}">View applications</a></p>`,
  });
}

export async function notifyShortlisted(gigTitle: string, applicantEmail: string, applicantId: string, gigId: string) {
  await createNotification({
    userId: applicantId,
    type: "shortlist",
    title: "Application Shortlisted",
    body: `Your application for "${gigTitle}" has been shortlisted`,
    link: `/gigs/${gigId}`,
  });
  await sendEmail({
    to: applicantEmail,
    subject: `Application shortlisted for "${gigTitle}"`,
    html: `<p>Your application for <strong>${gigTitle}</strong> has been shortlisted.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/gigs/${gigId}">View gig</a></p>`,
  });
}

export async function notifyHired(gigTitle: string, applicantEmail: string, applicantId: string, gigId: string) {
  await createNotification({
    userId: applicantId,
    type: "hired",
    title: "You've Been Hired!",
    body: `Congratulations! You've been hired for "${gigTitle}"`,
    link: `/messages`,
  });
  await sendEmail({
    to: applicantEmail,
    subject: `You've been hired for "${gigTitle}"`,
    html: `<p>Congratulations! You've been hired for <strong>${gigTitle}</strong>.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/messages">Start chatting</a></p>`,
  });
}

export async function notifyNewMessage(recipientEmail: string, recipientId: string, threadId: string, senderName: string) {
  const key = `message-${threadId}-${recipientId}`;
  if (!shouldSendEmail(key)) return;

  await createNotification({
    userId: recipientId,
    type: "message",
    title: "New Message",
    body: `You have a new message from ${senderName}`,
    link: `/messages`,
  });
  await sendEmail({
    to: recipientEmail,
    subject: `New message from ${senderName}`,
    html: `<p>You have a new message from <strong>${senderName}</strong>.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/messages">View message</a></p>`,
  });
}

export async function notifyGigReopen(gigTitle: string, applicantEmail: string, applicantId: string, gigId: string) {
  await createNotification({
    userId: applicantId,
    type: "gig_reopen",
    title: "Gig Reopened",
    body: `"${gigTitle}" has been reopened for applications`,
    link: `/gigs/${gigId}`,
  });
  await sendEmail({
    to: applicantEmail,
    subject: `"${gigTitle}" has been reopened`,
    html: `<p>The gig <strong>${gigTitle}</strong> you previously applied to has been reopened.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/gigs/${gigId}">View gig</a></p>`,
  });
}
