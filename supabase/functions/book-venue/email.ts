import { Resend } from "npm:resend@4.1.2";
import type { BookingRow } from "./types.ts";

function formatDates(dates: string[]): string {
  if (dates.length === 1) return dates[0];
  if (dates.length === 2) return `${dates[0]} to ${dates[1]}`;
  return dates.join(", ");
}

function getResendClient(): Resend {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  return new Resend(apiKey);
}

function getAdminEmail(): string {
  return Deno.env.get("BOOKING_ADMIN_EMAIL")?.trim() || "admin@studiospace.community";
}

function getFromEmail(): string {
  return Deno.env.get("BOOKING_FROM_EMAIL")?.trim() || "Studio Space <bookings@studiospace.community>";
}

export async function sendBookingEmails(booking: BookingRow): Promise<void> {
  const resend = getResendClient();
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

  await resend.emails.send({
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

  await resend.emails.send({
    from: fromEmail,
    to: [booking.email],
    subject: userSubject,
    text: userText,
  });
}
