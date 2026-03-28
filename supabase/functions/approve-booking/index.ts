import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function htmlResponse(html: string, status: number): Response {
  return new Response(html, {
    status,
    headers: {
      ...corsHeaders,
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
    p, form { color: #444; line-height: 1.5; }
    button {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      font-size: 1rem;
      cursor: pointer;
      background: #111;
      color: #fff;
      border: none;
      border-radius: 0.5rem;
    }
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

/** `bookings.dates` is text[]; PostgREST usually returns a JSON array, but normalize defensively. */
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

function normalizeBlockedDateList(booking: {
  dates: unknown;
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
    .select("id, dates, approved_at, booking_mode, continuous_start, continuous_end")
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
        "Already approved",
        "<p>This booking was already approved. Those dates stay blocked on the public calendar.</p>",
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

  const { error: blockErr } = await supabase.from("venue_blocked_dates").upsert(rows, {
    onConflict: "blocked_date",
  });

  if (blockErr) {
    console.error("approve-booking blocks:", blockErr);
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
      "Booking approved",
      "<p>Thank you. These dates are now unavailable on the public Host an Activity calendar.</p>",
    ),
    200,
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const validPath =
    url.pathname.endsWith("/approve-booking") || url.pathname.endsWith("/api/approve-booking");
  if (!validPath) {
    return htmlResponse(page("Not found", "<p>This link is not valid.</p>"), 404);
  }

  if (req.method === "GET") {
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
    const postUrl = `${url.origin}${url.pathname}`;
    const postUrlAttr = postUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    const body = `<p>This will mark the booking as approved and block the requested dates on the public calendar.</p>
<form method="post" action="${postUrlAttr}" enctype="application/x-www-form-urlencoded">
  <input type="hidden" name="token" value="${token.replace(/"/g, "&quot;")}" />
  <button type="submit">Approve booking</button>
</form>`;
    return htmlResponse(page("Approve booking?", body), 200);
  }

  if (req.method === "POST") {
    let token = "";
    const ct = (req.headers.get("content-type") ?? "").toLowerCase();
    try {
      if (ct.includes("multipart/form-data")) {
        const fd = await req.formData();
        const v = fd.get("token");
        token = typeof v === "string" ? v.trim() : "";
      } else {
        const text = await req.text();
        token = new URLSearchParams(text).get("token")?.trim() ?? "";
        if (!token && text.trim().startsWith("{")) {
          try {
            token = String((JSON.parse(text) as { token?: string }).token ?? "").trim();
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e) {
      console.error("approve-booking POST parse:", e);
    }
    if (!token || !uuidRe.test(token)) {
      return htmlResponse(
        page("Invalid request", "<p>Missing or invalid token. Open the link from your email again.</p>"),
        400,
      );
    }
    try {
      return await runApprove(token);
    } catch (e) {
      console.error("approve-booking:", e);
      return htmlResponse(page("Error", "<p>Something went wrong. Try again later.</p>"), 500);
    }
  }

  return htmlResponse(page("Method not allowed", "<p>Open the approve link from your email in a browser.</p>"), 405);
});
