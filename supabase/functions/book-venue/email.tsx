import React from "npm:react@18.3.1";
import { renderEmailToHtml } from "../_shared/renderEmail.tsx";
import BookingConfirmationEmail from "../../../emails/templates/BookingConfirmationEmail.tsx";
import VenueBookingAdminEmail from "../../../emails/templates/VenueBookingAdminEmail.tsx";
import type { BookingRow, PerDateTimeEntry } from "./types.ts";
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
    console.warn("book-venue: Supabase client unavailable:", e);
    return null;
  }
}

const isoYmdRe = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Display calendar dates in emails as DD-MM-YYYY (storage stays YYYY-MM-DD). */
function formatBookingDateDdMmYyyy(isoYmd: string): string {
  const s = isoYmd.trim().slice(0, 10);
  const m = s.match(isoYmdRe);
  if (!m) return s;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** `YYYY-MM-DDTHH:mm` → `DD-MM-YYYY HH:mm` */
function formatBookingDateTimeDdMmYyyy(dateTimeLocal: string): string {
  const t = dateTimeLocal.trim();
  const i = t.indexOf("T");
  if (i === -1) return formatBookingDateDdMmYyyy(t);
  const datePart = t.slice(0, i);
  const timePart = t.slice(i + 1, i + 6);
  return `${formatBookingDateDdMmYyyy(datePart)} ${/^\d{2}:\d{2}$/.test(timePart) ? timePart : t.slice(i + 1)}`;
}

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
    .map((e) => `${formatBookingDateDdMmYyyy(e.date)}: ${e.startTime}–${e.endTime}`)
    .join("\n");
}

type NonContinuousScheduleKind =
  | "per_day_custom"
  | "shared_booking_window"
  | "single_day_shared_times"
  | "empty";

type NonContinuousEmailBody = {
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
      detailHeader: "Dates & times (one row per day):",
      body: formatPerDateTimes(per),
      kind: "per_day_custom",
    };
  }
  const list = Array.isArray(dates) ? dates : [];
  if (list.length === 0) {
    return {
      detailHeader: "",
      body: "(No dates listed)",
      kind: "empty",
    };
  }
  const sorted = [...list].sort();
  const st = (startTime ?? "").trim().slice(0, 5);
  const et = (endTime ?? "").trim().slice(0, 5);

  if (sorted.length >= 2) {
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return {
      detailHeader: "Booking window and selected days:",
      body: [
        `From: ${formatBookingDateDdMmYyyy(first)} ${st}`,
        `To: ${formatBookingDateDdMmYyyy(last)} ${et}`,
        "",
        "Selected calendar day(s) (may include gaps):",
        sorted.map((d) => formatBookingDateDdMmYyyy(d)).join(", "),
      ].join("\n"),
      kind: "shared_booking_window",
    };
  }

  return {
    detailHeader: "Date & time:",
    body: `${formatBookingDateDdMmYyyy(sorted[0])}: ${st}–${et}`,
    kind: "single_day_shared_times",
  };
}

function scheduleBlock(booking: BookingRow): string {
  const mode = booking.booking_mode ?? "non_continuous";
  if (mode === "continuous" && booking.continuous_start && booking.continuous_end) {
    return [
      `From: ${formatBookingDateTimeDdMmYyyy(booking.continuous_start)}`,
      `To: ${formatBookingDateTimeDdMmYyyy(booking.continuous_end)}`,
      "(All hours from start through end are requested.)",
    ].join("\n");
  }
  const per = normalizePerDateEntries(booking.per_date_times);
  const { detailHeader, body } = formatNonContinuousScheduleForEmail(
    booking.dates,
    per,
    booking.start_time,
    booking.end_time,
  );
  return [detailHeader, body].filter(Boolean).join("\n");
}

function scheduleBlockUser(booking: BookingRow): string {
  const mode = booking.booking_mode ?? "non_continuous";
  if (mode === "continuous" && booking.continuous_start && booking.continuous_end) {
    return `When: ${formatBookingDateTimeDdMmYyyy(booking.continuous_start)} → ${formatBookingDateTimeDdMmYyyy(booking.continuous_end)}`;
  }
  const per = normalizePerDateEntries(booking.per_date_times);
  const { kind, body } = formatNonContinuousScheduleForEmail(
    booking.dates,
    per,
    booking.start_time,
    booking.end_time,
  );
  const userHeader =
    kind === "per_day_custom"
      ? "Dates & times (each line is one day):"
      : kind === "shared_booking_window"
        ? "Booking window and selected days:"
        : kind === "single_day_shared_times"
          ? "Date & time:"
          : "Schedule:";
  return [userHeader, body].filter(Boolean).join("\n");
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
    "",
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

  const requestDetailsHeader = "Request details\n\n";

  const acceptFooterText = approveUrl
    ? [
        "",
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
      ].join("\n")
    : "";

  const adminText = approveUrl
    ? [requestDetailsHeader, adminDetails, acceptFooterText].join("")
    : [
        "WARNING: No approval token on this booking — accept link unavailable. Check DB migrations.",
        "",
        requestDetailsHeader,
        adminDetails,
      ].join("\n");

  const adminHtml = renderEmailToHtml(
    <VenueBookingAdminEmail
      detailsPlainText={adminDetails}
      approveUrl={approveUrl || undefined}
    />,
  );

  const supabase = safeServiceClient();

  let adminHtmlOut = adminHtml;
  if (supabase) {
    const tid = createTrackingId();
    const ok = await insertEmailLog(supabase, {
      userId: null,
      emailType: "booking_admin",
      trackingId: tid,
    });
    if (ok) adminHtmlOut = applyEmailHtmlTracking(adminHtml, tid);
  }

  console.log(`book-venue: sending admin email to ${adminEmail} from ${fromEmail}`);
  await resendSend({
    from: fromEmail,
    to: [adminEmail],
    subject: adminSubject,
    text: adminText,
    html: adminHtmlOut,
  });
  console.log("book-venue: admin email sent successfully");

  if (!booking.email) {
    console.warn("book-venue: no user email — skipping confirmation email");
    return;
  }

  let userRow = null;
  if (supabase) {
    try {
      userRow = await getUserByEmail(supabase, booking.email);
    } catch (e) {
      console.warn("book-venue: could not load users row for email prefs:", e);
    }
  } else {
    try {
      userRow = await getUserByEmail(getServiceRoleClient(), booking.email);
    } catch (e) {
      console.warn("book-venue: could not load users row for email prefs:", e);
    }
  }

  if (shouldSkipUserEmail(userRow)) {
    console.log("book-venue: skipping user confirmation (unsubscribed):", booking.email);
    return;
  }

  const userSubject = "We received your Studio Space booking request";
  const userText = [
    `Hi ${booking.full_name},`,
    "",
    "Thanks for your booking request.",
    "",
    "We received the details below:",
    "",
    scheduleBlockUser(booking),
    "",
    `Activity: ${booking.activity_type}`,
    `Group Size: ${booking.group_size}`,
    "",
    "We will contact you shortly to confirm availability.",
    "",
    "Warm regards,",
    "Studio Space",
  ].join("\n");

  const footer = buildEmailFooterLinks(userRow?.unsubscribe_token ?? null);
  const userTextFull = footer ? `${userText}${footer.text}` : userText;

  const userHtml = renderEmailToHtml(
    <BookingConfirmationEmail
      recipientName={booking.full_name}
      scheduleBlock={scheduleBlockUser(booking)}
      activityType={booking.activity_type}
      groupSize={booking.group_size}
      unsubscribeUrl={footer?.unsubscribeUrl}
      preferencesUrl={footer?.preferencesUrl}
    />,
  );

  let userHtmlOut = userHtml;
  if (supabase) {
    const tid = createTrackingId();
    const ok = await insertEmailLog(supabase, {
      userId: userRow?.id ?? null,
      emailType: "booking_user",
      trackingId: tid,
    });
    if (ok) userHtmlOut = applyEmailHtmlTracking(userHtml, tid);
  }

  console.log(`book-venue: sending confirmation email to ${booking.email}`);
  await resendSend({
    from: fromEmail,
    to: [booking.email],
    subject: userSubject,
    text: userTextFull,
    html: userHtmlOut,
  });
  console.log("book-venue: confirmation email sent successfully");
}
