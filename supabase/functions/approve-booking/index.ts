import { createClient } from "npm:@supabase/supabase-js@2";

function htmlResponse(html: string, status: number): Response {
  return new Response(html, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}

const page = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 3rem auto; padding: 0 1rem; color: #111; }
    h1 { font-size: 1.25rem; }
    p { color: #444; line-height: 1.5; }
    .ok { color: #047857; }
    .warn { color: #b45309; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${body}
</body>
</html>`;

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isoDateRe = /^\d{4}-\d{2}-\d{2}$/;

function enumerateInclusiveDates(startIsoDate: string, endIsoDate: string): string[] {
  const out: string[] = [];
  let cur = new Date(startIsoDate + "T12:00:00");
  const end = new Date(endIsoDate + "T12:00:00");
  while (cur <= end) {
    const y = cur.getFullYear();
    const mo = String(cur.getMonth() + 1).padStart(2, "0");
    const day = String(cur.getDate()).padStart(2, "0");
    out.push(`${y}-${mo}-${day}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function rawDatesToStrings(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t.startsWith("{") && t.endsWith("}")) {
      const inner = t.slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(",").map((s) => s.replace(/^"|"$/g, "").trim()).filter(Boolean);
    }
    try {
      const j = JSON.parse(t) as unknown;
      if (Array.isArray(j)) return rawDatesToStrings(j);
    } catch {
      /* ignore */
    }
    if (isoDateRe.test(t.slice(0, 10))) return [t.slice(0, 10)];
  }
  return [];
}

function datesFromPerDateTimes(raw: unknown): string[] {
  if (raw == null) return [];
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      if (Array.isArray(p)) arr = p;
    } catch {
      return [];
    }
  } else return [];
  const out: string[] = [];
  for (const row of arr) {
    if (row && typeof row === "object" && "date" in row) {
      const d = String((row as { date?: string }).date ?? "").trim().slice(0, 10);
      if (isoDateRe.test(d)) out.push(d);
    }
  }
  return [...new Set(out)].sort();
}

function normalizeBlockedDateList(booking: {
  dates: unknown;
  per_date_times: unknown;
  booking_mode: string | null;
  continuous_start: string | null;
  continuous_end: string | null;
}): string[] {
  const fromDb = [
    ...new Set(
      rawDatesToStrings(booking.dates)
        .map((d) => d.slice(0, 10))
        .filter((d) => isoDateRe.test(d)),
    ),
  ].sort();
  if (fromDb.length > 0) return fromDb;

  const fromPerDay = datesFromPerDateTimes(booking.per_date_times);
  if (fromPerDay.length > 0) return fromPerDay;

  const mode = booking.booking_mode ?? "non_continuous";
  if (mode === "continuous" && booking.continuous_start && booking.continuous_end) {
    const s = booking.continuous_start.trim().slice(0, 10);
    const e = booking.continuous_end.trim().slice(0, 10);
    if (isoDateRe.test(s) && isoDateRe.test(e)) {
      return enumerateInclusiveDates(s, e);
    }
  }

  return [];
}

async function runApprove(token: string): Promise<Response> {
  const supabase = getSupabaseAdmin();

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, dates, approved_at, booking_mode, continuous_start, continuous_end, per_date_times")
    .eq("approval_token", token)
    .maybeSingle();

  if (fetchErr) {
    console.error("approve-booking lookup:", fetchErr);
    return htmlResponse(page("Error", "<p>Could not look up this booking. Try again later.</p>"), 500);
  }

  if (!booking) {
    return htmlResponse(
      page(
        "Link expired or invalid",
        "<p>No booking matches this link. The request may have been updated or removed.</p>",
      ),
      404,
    );
  }

  if (booking.approved_at) {
    return htmlResponse(
      page(
        "Already approved &#10003;",
        '<p class="ok">This booking was already approved. Those dates stay blocked on the public calendar.</p>',
      ),
      200,
    );
  }

  const blockDates = normalizeBlockedDateList(booking);
  if (blockDates.length === 0) {
    console.error("approve-booking: no dates after normalize", {
      id: booking.id,
      rawDates: booking.dates,
      mode: booking.booking_mode,
    });
    return htmlResponse(page("Error", "<p>This booking has no dates to approve.</p>"), 500);
  }

  const rows = blockDates.map((d) => ({
    blocked_date: d,
    booking_id: booking.id,
  }));

  const { error: blockErr } = await supabase
    .from("venue_blocked_dates")
    .upsert(rows, { onConflict: "blocked_date" });

  if (blockErr) {
    console.error("approve-booking blocks:", blockErr.message, blockErr.code, blockErr.details);
    return htmlResponse(page("Error", "<p>Could not block the calendar dates. Try again later.</p>"), 500);
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("bookings")
    .update({ approved_at: now })
    .eq("id", booking.id);

  if (updateErr) {
    console.error("approve-booking update:", updateErr);
    await supabase.from("venue_blocked_dates").delete().eq("booking_id", booking.id);
    return htmlResponse(page("Error", "<p>Could not finalize approval. Try again later.</p>"), 500);
  }

  console.log("approve-booking: approved", booking.id, "blocked", blockDates);

  return htmlResponse(
    page(
      "Booking approved &#10003;",
      `<p class="ok">Done. The following dates are now blocked on the public Host an Activity calendar:</p>
       <p><strong>${blockDates.join(", ")}</strong></p>`,
    ),
    200,
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const url = new URL(req.url);
  const validPath =
    url.pathname.endsWith("/approve-booking") || url.pathname.endsWith("/api/approve-booking");
  if (!validPath) {
    return htmlResponse(page("Not found", "<p>This link is not valid.</p>"), 404);
  }

  const token = url.searchParams.get("token")?.trim();
  if (!token || !uuidRe.test(token)) {
    return htmlResponse(
      page(
        "Invalid link",
        "<p>The approval link is missing a valid token. Use the link from your admin email.</p>",
      ),
      400,
    );
  }

  try {
    return await runApprove(token);
  } catch (e) {
    console.error("approve-booking:", e);
    return htmlResponse(page("Error", "<p>Something went wrong. Try again later.</p>"), 500);
  }
});
