import type { BookingRow } from "./types.ts";

function formatDates(dates: string[]): string {
  if (dates.length === 1) return dates[0];
  if (dates.length === 2) return `${dates[0]} to ${dates[1]}`;
  return dates.join(", ");
}

function getAdminEmail(): string {
  return Deno.env.get("BOOKING_ADMIN_EMAIL")?.trim() || "admin@studiospace.community";
}

function getFromEmail(): string {
  return Deno.env.get("BOOKING_FROM_EMAIL")?.trim() || "Studio Space <bookings@studiospace.community>";
}

/** Resend REST API — avoids Node-only npm quirks in Deno Edge Functions. */
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

export async function sendBookingEmails(booking: BookingRow): Promise<void> {
  const adminEmail = getAdminEmail();
  const fromEmail = getFromEmail();
  const dateSummary = formatDates(booking.dates);

  const adminSubject = `New venue booking request from ${booking.full_name}`;
  const adminText = [
    "A new venue booking request was submitted.",
    "",
    `Booking ID: ${booking.id}`,
    `Created At: ${booking.created_at}`,
    `Name: ${booking.full_name}`,
    `Phone: ${booking.phone}`,
    `Email: ${booking.email}`,
    `Activity: ${booking.activity_type}`,
    `Group Size: ${booking.group_size}`,
    `Dates: ${dateSummary}`,
    `Time: ${booking.start_time} - ${booking.end_time}`,
    `Notes: ${booking.notes ?? "None"}`,
  ].join("\n");

  await resendSend({
    from: fromEmail,
    to: [adminEmail],
    subject: adminSubject,
    text: adminText,
  });

  const userSubject = "We received your Studio Space booking request";
  const userText = [
    `Hi ${booking.full_name},`,
    "",
    "Thanks for your booking request. We received the details below:",
    `Dates: ${dateSummary}`,
    `Time: ${booking.start_time} - ${booking.end_time}`,
    `Activity: ${booking.activity_type}`,
    `Group Size: ${booking.group_size}`,
    "",
    "We will contact you shortly to confirm availability.",
    "",
    "Studio Space",
  ].join("\n");

  await resendSend({
    from: fromEmail,
    to: [booking.email],
    subject: userSubject,
    text: userText,
  });
}
