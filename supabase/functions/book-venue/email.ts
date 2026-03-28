import type { BookingRow, PerDateTimeEntry } from "./types.ts";

/** Supabase jsonb is usually an array; guard string / null for email formatting. */
function normalizePerDateEntries(raw: unknown): PerDateTimeEntry[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw) && raw.length > 0) return raw as PerDateTimeEntry[];
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      if (Array.isArray(p) && p.length > 0) return p as PerDateTimeEntry[];
    } catch {
      /* ignore */
    }
  }
  return null;
}

function formatPerDateTimes(entries: PerDateTimeEntry[]): string {
  return entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => `${e.date}: ${e.startTime}–${e.endTime}`)
    .join("\n");
}

/** Local "datetime-local" instant for comparisons (matches book-venue schema). */
function dateTimeLocalToMs(s: string): number {
  const [datePart, timePart] = s.trim().split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
}

/**
 * When end clock time is before start (e.g. 07:00 vs 09:00), shared times mean
 * "start on the first selected day @ start, end on the last @ end" — not the same
 * hours repeated on every listed day.
 */
function isFirstDayThroughLastDayWindow(
  sortedDates: string[],
  startHhmm: string,
  endHhmm: string,
): boolean {
  if (sortedDates.length < 2) return false;
  if (startHhmm < endHhmm) return false;
  const startDt = `${sortedDates[0]}T${startHhmm}`;
  const endDt = `${sortedDates[sortedDates.length - 1]}T${endHhmm}`;
  return dateTimeLocalToMs(endDt) > dateTimeLocalToMs(startDt);
}

type NonContinuousScheduleKind =
  | "per_day_custom"
  | "same_hours_each_day"
  | "first_last_window"
  | "empty";

type NonContinuousEmailBody = {
  typeLine: string;
  detailHeader: string;
  body: string;
  kind: NonContinuousScheduleKind;
};

function formatNonContinuousScheduleForEmail(
  dates: string[] | null | undefined,
  per: PerDateTimeEntry[] | null,
  startTime: string,
  endTime: string,
): NonContinuousEmailBody {
  if (per && per.length > 0) {
    return {
      typeLine: "Type: Non-continuous (custom time per day)",
      detailHeader: "Dates & times (one row per day):",
      body: formatPerDateTimes(per),
      kind: "per_day_custom",
    };
  }
  const list = Array.isArray(dates) ? dates : [];
  if (list.length === 0) {
    return {
      typeLine: "Type: Non-continuous",
      detailHeader: "",
      body: "(No dates listed)",
      kind: "empty",
    };
  }
  const sorted = [...list].sort();
  const st = (startTime ?? "").trim().slice(0, 5);
  const et = (endTime ?? "").trim().slice(0, 5);

  if (isFirstDayThroughLastDayWindow(sorted, st, et)) {
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return {
      typeLine:
        "Type: Non-continuous (one window: start on first selected day, end on last — not the same hours every day)",
      detailHeader: "Booking window and selected days:",
      body: [
        `From: ${first} ${st}`,
        `To:   ${last} ${et}`,
        "",
        "Selected calendar day(s) (may include gaps):",
        sorted.join(", "),
      ].join("\n"),
      kind: "first_last_window",
    };
  }

  return {
    typeLine: "Type: Non-continuous (same hours on each listed day)",
    detailHeader: "Dates & times (one row per day):",
    body: sorted.map((d) => `${d}: ${st}–${et}`).join("\n"),
    kind: "same_hours_each_day",
  };
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
  const per = normalizePerDateEntries(booking.per_date_times);
  const { typeLine, detailHeader, body } = formatNonContinuousScheduleForEmail(
    booking.dates,
    per,
    booking.start_time,
    booking.end_time,
  );
  return [typeLine, detailHeader, body].filter(Boolean).join("\n");
}

function scheduleBlockUser(booking: BookingRow): string {
  const mode = booking.booking_mode ?? "non_continuous";
  if (mode === "continuous" && booking.continuous_start && booking.continuous_end) {
    return `When: ${booking.continuous_start} → ${booking.continuous_end} (continuous booking)`;
  }
  const per = normalizePerDateEntries(booking.per_date_times);
  const { kind, body } = formatNonContinuousScheduleForEmail(
    booking.dates,
    per,
    booking.start_time,
    booking.end_time,
  );
  const userHeader =
    kind === "first_last_window"
      ? "Your requested window:"
      : kind === "same_hours_each_day" || kind === "per_day_custom"
        ? "Dates & times (each line is one day):"
        : "Schedule:";
  return `${userHeader}\n${body}`;
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Resend REST API — avoids Node-only npm quirks in Deno Edge Functions. */
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

function adminEmailDetailsBody(booking: BookingRow): string {
  return [
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
  ].join("\n");
}

export async function sendBookingEmails(booking: BookingRow): Promise<void> {
  const adminEmail = getAdminEmail();
  const fromEmail = getFromEmail();

  const adminSubject = `New venue booking request from ${booking.full_name}`;
  const token = (booking.approval_token ?? "").trim();
  const approveUrl = token ? buildApproveBookingUrl(token) : "";

  const adminDetails = adminEmailDetailsBody(booking);

  const acceptIntroText = approveUrl
    ? [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "ACCEPT BOOKING — BLOCK DATES ON PUBLIC CALENDAR",
        "",
        "Use the link below to confirm this request. After you open it and click “Approve booking”,",
        "the listed dates are saved as unavailable so other visitors cannot select them on the",
        "Host an Activity calendar.",
        "",
        approveUrl,
        "",
        "(The extra step on the next page avoids accidental approval from email previews.)",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
        "Request details:",
        "",
      ].join("\n")
    : [
        "WARNING: No approval token on this booking — accept link unavailable. Check DB migrations.",
        "",
        "Request details:",
        "",
      ].join("\n");

  const adminText = [acceptIntroText, adminDetails].join("\n");

  const adminHtml = approveUrl
    ? `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111;background:#fafafa">
  <div style="max-width:40rem;margin:0 auto">
    <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;padding:20px 20px 18px;margin-bottom:20px">
      <p style="margin:0 0 8px;font-size:17px;font-weight:700;color:#065f46">Accept this booking</p>
      <p style="margin:0 0 16px;font-size:14px;color:#374151">
        Confirm to <strong>block these dates on the public calendar</strong> so other people cannot book them.
      </p>
      <p style="margin:0 0 12px">
        <a href="${escapeHtml(approveUrl)}" style="display:inline-block;background:#047857;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
          Accept &amp; block calendar dates
        </a>
      </p>
      <p style="margin:0;font-size:13px;color:#4b5563">
        Opens a secure page — click <strong>Approve booking</strong> there to finish (avoids accidental approval from inbox previews).
      </p>
    </div>
    <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#374151">Request details</p>
    <pre style="white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;background:#fff;padding:16px;border-radius:8px;border:1px solid #e5e7eb;margin:0">${escapeHtml(adminDetails)}</pre>
  </div>
</body>
</html>`
    : `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;font-family:system-ui,sans-serif">
  <p style="color:#b45309">No approval link could be generated for this booking.</p>
  <pre style="white-space:pre-wrap;font-family:monospace;font-size:12px">${escapeHtml(adminDetails)}</pre>
</body>
</html>`;

  console.log(`book-venue: sending admin email to ${adminEmail} from ${fromEmail}`);
  await resendSend({
    from: fromEmail,
    to: [adminEmail],
    subject: adminSubject,
    text: adminText,
    html: adminHtml,
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
