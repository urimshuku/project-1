/**
 * Paysera payment initiation API (one-time donations).
 *
 * Builds a signed redirect URL for Paysera's hosted payment page.
 * We store only non-sensitive data (amount, donor name, email, reference); no card/bank details.
 *
 * Flow:
 * 1. Frontend POSTs donation details + accepturl/cancelurl
 * 2. We create a pending record (order_id), build Paysera params, sign with PAYSERA_SIGN_PASSWORD
 * 3. Return payUrl; frontend redirects user to Paysera
 * 4. Paysera calls paysera-callback (GET) to confirm payment; we then move pending → donations
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import md5 from "npm:md5@2.3.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Load credentials from environment (never expose sign password to frontend)
    const projectId = (Deno.env.get("PAYSERA_PROJECT_ID") ?? "").trim();
    const signPassword = (Deno.env.get("PAYSERA_SIGN_PASSWORD") ?? "").trim();
    if (!projectId || !signPassword) {
      throw new Error("Missing PAYSERA_PROJECT_ID or PAYSERA_SIGN_PASSWORD");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase config");
    }

    const body = await req.json();
    const {
      category_id,
      donor_name,
      email,
      amount,
      is_anonymous,
      words_of_support,
      accepturl,
      cancelurl,
    } = body;

    // Validate required fields
    if (!category_id || donor_name == null || amount == null || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request: category_id, donor_name, amount required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!email || typeof email !== "string" || !email.trim()) {
      return new Response(
        JSON.stringify({ error: "Email address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!accepturl || !cancelurl) {
      return new Response(
        JSON.stringify({ error: "accepturl and cancelurl required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unique order reference for this donation (used in callback to match payment)
    const normalizedEmail = String(email).trim().toLowerCase();
    const orderId = crypto.randomUUID();
    const callbackUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/paysera-callback`;
    const amountCents = Math.round(Number(amount) * 100);
    const version = "1.6";
    const test = Deno.env.get("PAYSERA_TEST") === "true" ? "1" : "0";

    // Build Paysera request params (order matters for signing)
    // p_email: pre-fill payer email on Paysera page; we do not send billing address unless Paysera requires it
    const params: Record<string, string> = {
      projectid: projectId,
      orderid: orderId,
      amount: String(amountCents),
      currency: "EUR",
      accepturl,
      cancelurl,
      callbackurl: callbackUrl,
      test,
      version,
      p_email: normalizedEmail.slice(0, 255),
    };

    const query = new URLSearchParams(params).toString();
    // Paysera encoding: base64 with URL-safe chars (replace +/ with -_)
    const dataRaw = btoa(unescape(encodeURIComponent(query)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    // Sign: MD5(data + sign_password) — Paysera spec: sign the encoded data string then append password
    const sign = (md5 as (s: string) => string)(dataRaw + signPassword);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: existingRows, error: existingError } = await supabase
      .from("pending_paysera_donations")
      .select("order_id")
      .ilike("email", normalizedEmail)
      .eq("category_id", category_id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingError) {
      console.error("Failed to check existing pending donation:", existingError);
      throw new Error("Failed to check existing pending donation");
    }

    const existingOrder = existingRows?.[0]?.order_id as string | undefined;
    const pendingPayload = {
      order_id: orderId,
      category_id,
      donor_name: body.is_anonymous ? "Anonymous" : donor_name,
      email: normalizedEmail.slice(0, 255) || null,
      amount: Number(amount),
      is_anonymous: Boolean(is_anonymous),
      words_of_support: words_of_support?.trim().slice(0, 150) || null,
    };

    if (existingOrder) {
      const { error: updateError } = await supabase
        .from("pending_paysera_donations")
        .update(pendingPayload)
        .eq("order_id", existingOrder);
      if (updateError) {
        console.error("Failed to update pending Paysera donation:", updateError);
        throw new Error("Failed to update pending donation");
      }
    } else {
      const { error: insertError } = await supabase.from("pending_paysera_donations").insert(pendingPayload);
      if (insertError) {
        console.error("Failed to store pending Paysera donation:", insertError);
        throw new Error("Failed to store pending donation");
      }
    }

    const payUrl = `https://www.paysera.com/pay/?data=${encodeURIComponent(dataRaw)}&sign=${sign}`;
    const message = existingOrder
      ? "You're already signed up. We updated your previous request."
      : undefined;
    return new Response(JSON.stringify({ payUrl, orderId, alreadySignedUp: Boolean(existingOrder), updatedExisting: Boolean(existingOrder), message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("paysera-pay-url error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
