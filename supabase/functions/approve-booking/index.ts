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

async function runApprove(token: string): Promise<Response> {
  const supabase = getSupabaseAdmin();

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, dates, approved_at")
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

  const dates = (booking.dates as string[]) ?? [];
  if (dates.length === 0) {
    return htmlResponse(page("Error", "<p>This booking has no dates to approve.</p>"), 500);
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("bookings")
    .update({ approved_at: now })
    .eq("id", booking.id);

  if (updateErr) {
    console.error("approve-booking update:", updateErr);
    return htmlResponse(page("Error", "<p>Could not approve this booking. Try again later.</p>"), 500);
  }

  const rows = dates.map((d) => ({
    blocked_date: d,
    booking_id: booking.id,
  }));

  const { error: blockErr } = await supabase.from("venue_blocked_dates").upsert(rows, {
    onConflict: "blocked_date",
  });

  if (blockErr) {
    console.error("approve-booking blocks:", blockErr);
    await supabase.from("bookings").update({ approved_at: null }).eq("id", booking.id);
    return htmlResponse(page("Error", "<p>Could not block the calendar dates. Try again later.</p>"), 500);
  }

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
    const body = `<p>This will mark the booking as approved and block the requested dates on the public calendar.</p>
<form method="post" action="">
  <input type="hidden" name="token" value="${token.replace(/"/g, "&quot;")}" />
  <button type="submit">Approve booking</button>
</form>`;
    return htmlResponse(page("Approve booking?", body), 200);
  }

  if (req.method === "POST") {
    let token = "";
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      token = params.get("token")?.trim() ?? "";
    } else {
      try {
        const j = await req.json() as { token?: string };
        token = (j.token ?? "").trim();
      } catch {
        /* ignore */
      }
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
