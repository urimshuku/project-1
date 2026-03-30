import type { ActivityJoinRow } from "./types.ts";

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

  console.log(`join-activity: sending confirmation email to ${join.email}`);
  await resendSend({
    from: fromEmail,
    to: [join.email],
    subject: userSubject,
    text: userText,
  });
  console.log("join-activity: confirmation email sent successfully");
}
