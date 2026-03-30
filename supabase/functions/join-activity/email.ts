import type { ActivityJoinRow } from "./types.ts";
import { buildEmailFooterLinks, shouldSkipUserEmail } from "../_shared/emailFooter.ts";
import { getUserByEmail } from "../_shared/usersDb.ts";
import { getServiceRoleClient } from "../_shared/supabaseService.ts";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getAdminEmail(): string {
  return Deno.env.get("BOOKING_ADMIN_EMAIL")?.trim() || "admin@studiospace.community";
}

function getFromEmail(): string {
  return Deno.env.get("BOOKING_FROM_EMAIL")?.trim() || "Studio Space <bookings@studiospace.community>";
}

async function resendSend(params: {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      ...(params.html ? { html: params.html } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Resend API error:", res.status, body);
    throw new Error(`Resend API error: ${res.status}`);
  }
}

export async function sendJoinEmails(join: ActivityJoinRow): Promise<void> {
  const adminEmail = getAdminEmail();
  const fromEmail = getFromEmail();
  const activitiesList = join.activities.join(", ");

  const adminSubject = `New activity join request from ${join.full_name}`;
  const adminText = [
    "A new activity join request was submitted.",
    "",
    `Join ID: ${join.id}`,
    `Created At: ${join.created_at}`,
    "",
    `Name: ${join.full_name}`,
    `Phone: ${join.phone ?? "(not provided)"}`,
    `Email: ${join.email ?? "(not provided)"}`,
    `Activities: ${activitiesList}`,
    `Future activity ideas: ${join.future_activities ?? "None"}`,
  ].join("\n");

  console.log(`join-activity: sending admin email to ${adminEmail} from ${fromEmail}`);
  await resendSend({
    from: fromEmail,
    to: [adminEmail],
    subject: adminSubject,
    text: adminText,
  });
  console.log("join-activity: admin email sent successfully");

  if (!join.email) {
    console.warn("join-activity: no user email — skipping confirmation email");
    return;
  }

  let userRow = null;
  try {
    const supabase = getServiceRoleClient();
    userRow = await getUserByEmail(supabase, join.email);
  } catch (e) {
    console.warn("join-activity: could not load users row for email prefs:", e);
  }

  if (shouldSkipUserEmail(userRow)) {
    console.log("join-activity: skipping user confirmation (unsubscribed):", join.email);
    return;
  }

  const userSubject = "We received your Studio Space activity join request";
  const userText = [
    `Hi ${join.full_name},`,
    "",
    "Thank you for your interest in joining in Studio Space Activities!",
    "",
    "We received the details below:",
    `Activities selected: ${activitiesList}`,
    "",
    "We will be in touch with you soon with more information.",
    "",
    "Warm regards,",
    "Studio Space",
  ].join("\n");

  const footer = buildEmailFooterLinks(userRow?.unsubscribe_token ?? null);
  const userTextFull = footer ? `${userText}${footer.text}` : userText;
  const userHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111;background:#fafafa">
  <div style="max-width:40rem;margin:0 auto">
    <pre style="margin:0;font-size:14px;line-height:1.5;white-space:pre-wrap;font-family:inherit;color:#374151">${escapeHtml(userText)}</pre>
    ${footer?.html ?? ""}
  </div>
</body>
</html>`;

  console.log(`join-activity: sending confirmation email to ${join.email}`);
  await resendSend({
    from: fromEmail,
    to: [join.email],
    subject: userSubject,
    text: userTextFull,
    html: userHtml,
  });
  console.log("join-activity: confirmation email sent successfully");
}
