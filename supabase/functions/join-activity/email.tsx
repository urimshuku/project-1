import React from "npm:react@18.3.1";
import { renderEmailToHtml } from "../_shared/renderEmail.tsx";
import JoinActivityAdminEmail from "../../../emails/templates/JoinActivityAdminEmail.tsx";
import JoinActivityConfirmationEmail from "../../../emails/templates/JoinActivityConfirmationEmail.tsx";
import type { ActivityJoinRow } from "./types.ts";
import {
  applyEmailHtmlTracking,
  createTrackingId,
  insertEmailLog,
} from "../_shared/emailTracking.ts";
import { buildEmailFooterLinks, shouldSkipUserEmail } from "../_shared/emailFooter.ts";
import { getUserByEmail } from "../_shared/usersDb.ts";
import { getServiceRoleClient } from "../_shared/supabaseService.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

function safeServiceClient(): SupabaseClient | null {
  try {
    return getServiceRoleClient();
  } catch (e) {
    console.warn("join-activity: Supabase client unavailable:", e);
    return null;
  }
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

function userJoinDetailsBlock(join: ActivityJoinRow, activitiesList: string): string {
  return [
    `Name: ${join.full_name}`,
    `Phone: ${join.phone ?? "(not provided)"}`,
    `Email: ${join.email ?? "(not provided)"}`,
    `Activities: ${activitiesList}`,
    `Future activity ideas: ${join.future_activities?.trim() ? join.future_activities : "None"}`,
  ].join("\n");
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

  const adminHtml = renderEmailToHtml(<JoinActivityAdminEmail bodyPlainText={adminText} />);

  const supabase = safeServiceClient();

  let adminHtmlOut = adminHtml;
  if (supabase) {
    const tid = createTrackingId();
    const ok = await insertEmailLog(supabase, {
      userId: null,
      emailType: "join_admin",
      trackingId: tid,
    });
    if (ok) adminHtmlOut = applyEmailHtmlTracking(adminHtml, tid);
  }

  console.log(`join-activity: sending admin email to ${adminEmail} from ${fromEmail}`);
  await resendSend({
    from: fromEmail,
    to: [adminEmail],
    subject: adminSubject,
    text: adminText,
    html: adminHtmlOut,
  });
  console.log("join-activity: admin email sent successfully");

  if (!join.email) {
    console.warn("join-activity: no user email — skipping confirmation email");
    return;
  }

  let userRow = null;
  if (supabase) {
    try {
      userRow = await getUserByEmail(supabase, join.email);
    } catch (e) {
      console.warn("join-activity: could not load users row for email prefs:", e);
    }
  } else {
    try {
      userRow = await getUserByEmail(getServiceRoleClient(), join.email);
    } catch (e) {
      console.warn("join-activity: could not load users row for email prefs:", e);
    }
  }

  if (shouldSkipUserEmail(userRow)) {
    console.log("join-activity: skipping user confirmation (unsubscribed):", join.email);
    return;
  }

  const userSubject = "We received your Studio Space activity join request";
  const detailsBlock = userJoinDetailsBlock(join, activitiesList);
  const userText = [
    `Hi ${join.full_name},`,
    "",
    "Thank you for your interest in joining Studio Space activities. We received the details below:",
    "",
    detailsBlock,
    "",
    "We will be in touch with you soon with more information.",
    "",
    "Warm regards,",
    "Studio Space",
  ].join("\n");

  const footer = buildEmailFooterLinks(userRow?.unsubscribe_token ?? null);
  const userTextFull = footer ? `${userText}${footer.text}` : userText;

  const userHtml = renderEmailToHtml(
    <JoinActivityConfirmationEmail
      recipientName={join.full_name}
      detailsBlock={detailsBlock}
      unsubscribeUrl={footer?.unsubscribeUrl}
      preferencesUrl={footer?.preferencesUrl}
    />,
  );

  let userHtmlOut = userHtml;
  if (supabase) {
    const tid = createTrackingId();
    const ok = await insertEmailLog(supabase, {
      userId: userRow?.id ?? null,
      emailType: "join_user",
      trackingId: tid,
    });
    if (ok) userHtmlOut = applyEmailHtmlTracking(userHtml, tid);
  }

  console.log(`join-activity: sending confirmation email to ${join.email}`);
  await resendSend({
    from: fromEmail,
    to: [join.email],
    subject: userSubject,
    text: userTextFull,
    html: userHtmlOut,
  });
  console.log("join-activity: confirmation email sent successfully");
}
