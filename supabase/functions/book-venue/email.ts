import type { BookingRow, PerDateTimeEntry } from "./types.ts";

function formatDates(dates: string[]): string {
  if (dates.length === 1) return dates[0];
  if (dates.length === 2) return `${dates[0]} to ${dates[1]}`;
  return dates.join(", ");
}

function formatPerDateTimes(entries: PerDateTimeEntry[]): string {
  return entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => `${e.date}: ${e.startTime}–${e.endTime}`)
    .join("\n");
}

function scheduleBlock(booking: BookingRow): string {
  const mode = booking.booking_mode ?? "non_continuous";
  if (mode === "continuous" && booking.continuous_start && booking.continuous_end) {
    return [
      "Type: Continuous (single range)",
      `From: ${booking.continuous_start}`,
      `To:   ${booking.continuous_end}`,
      "(All hours from start through end are requested.)",
    ].join("\n");
  }
  const datesLine = `Dates: ${formatDates(booking.dates)}`;
  const per = booking.per_date_times;
  if (per && Array.isArray(per) && per.length > 0) {
    return [
      "Type: Non-continuous (custom time per day)",
      datesLine,
      "Times per day:",
      formatPerDateTimes(per as PerDateTimeEntry[]),
    ].join("\n");
  }
  return [
    "Type: Non-continuous (same time each day)",
    datesLine,
    `Time: ${booking.start_time} – ${booking.end_time} (applies to each selected date)`,
  ].join("\n");
}

function scheduleBlockUser(booking: BookingRow): string {
  const mode = booking.booking_mode ?? "non_continuous";
  if (mode === "continuous" && booking.continuous_start && booking.continuous_end) {
    return `When: ${booking.continuous_start} → ${booking.continuous_end} (continuous booking)`;
  }
  const per = booking.per_date_times;
  if (per && Array.isArray(per) && per.length > 0) {
    return [`Dates & times:`, formatPerDateTimes(per as PerDateTimeEntry[])].join("\n");
  }
  return `Dates: ${formatDates(booking.dates)}\nTime (each day): ${booking.start_time} – ${booking.end_time}`;
}

function getAdminEmail(): string {
  return Deno.env.get("BOOKING_ADMIN_EMAIL")?.trim() || "admin@studiospace.community";
}

function getFromEmail(): string {
  return Deno.env.get("BOOKING_FROM_EMAIL")?.trim() || "Studio Space <bookings@studiospace.community>";
}

function buildApproveBookingUrl(approvalToken: string): string {
  const base = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "") ?? "";
  return `${base}/functions/v1/approve-booking?token=${encodeURIComponent(approvalToken)}`;
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

  const adminSubject = `New venue booking request from ${booking.full_name}`;
  const approveUrl = booking.approval_token ? buildApproveBookingUrl(booking.approval_token) : "";
  const adminText = [
    "A new venue booking request was submitted.",
    "",
    `Booking ID: ${booking.id}`,
    `Created At: ${booking.created_at}`,
    `Name: ${booking.full_name}`,
    `Phone: ${booking.phone}`,
    `Email: ${booking.email ?? "(not provided)"}`,
    `Activity: ${booking.activity_type}`,
    `Group Size: ${booking.group_size}`,
    "",
    scheduleBlock(booking),
    "",
    `Notes: ${booking.notes ?? "None"}`,
    ...(approveUrl
      ? [
          "",
          "Approve (blocks these dates on the public booking calendar):",
          approveUrl,
          "",
          'Open the link, then click "Approve booking" to confirm. (This avoids accidental approval from email previews.)',
        ]
      : []),
  ].join("\n");

  console.log(`book-venue: sending admin email to ${adminEmail} from ${fromEmail}`);
  await resendSend({
    from: fromEmail,
    to: [adminEmail],
    subject: adminSubject,
    text: adminText,
  });
  console.log("book-venue: admin email sent successfully");

  if (!booking.email) {
    console.warn("book-venue: no user email — skipping confirmation email");
    return;
  }

  const userSubject = "We received your Studio Space booking request";
  const userText = [
    `Hi ${booking.full_name},`,
    "",
    "Thanks for your booking request. We received the details below:",
    "",
    scheduleBlockUser(booking),
    "",
    `Activity: ${booking.activity_type}`,
    `Group Size: ${booking.group_size}`,
    "",
    "We will contact you shortly to confirm availability.",
    "",
    "Studio Space",
  ].join("\n");

  console.log(`book-venue: sending confirmation email to ${booking.email}`);
  await resendSend({
    from: fromEmail,
    to: [booking.email],
    subject: userSubject,
    text: userText,
  });
  console.log("book-venue: confirmation email sent successfully");
}
