import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.15.0";

const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("Stripe-Signature");
  if (!signature) {
    return new Response("Missing Stripe-Signature", { status: 400 });
  }

  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error("Missing STRIPE_WEBHOOK_SECRET, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY");
    return new Response("Server configuration error", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = await Stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Webhook signature verification failed:", message);
    return new Response(message, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const categoryId = session.metadata?.category_id;
  const donorName = session.metadata?.donor_name ?? "Anonymous";
  const isAnonymous = session.metadata?.is_anonymous === "true";
  const wordsOfSupport = session.metadata?.words_of_support
    ? String(session.metadata.words_of_support).slice(0, 150)
    : null;

  const amountTotal = session.amount_total ?? 0;
  const amountEur = amountTotal / 100;

  if (!categoryId || amountEur <= 0) {
    console.error("Missing category_id or invalid amount in session", session.id);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { error: insertError } = await supabase.from("donations").insert({
    category_id: categoryId,
    donor_name: donorName,
    amount: amountEur,
    is_anonymous: isAnonymous,
    words_of_support: wordsOfSupport || undefined,
  });

  if (insertError) {
    console.error("Failed to insert donation:", insertError);
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: category, error: fetchError } = await supabase
    .from("categories")
    .select("current_amount")
    .eq("id", categoryId)
    .single();

  if (!fetchError && category) {
    const newAmount = Number(category.current_amount) + amountEur;
    await supabase
      .from("categories")
      .update({ current_amount: newAmount, updated_at: new Date().toISOString() })
      .eq("id", categoryId);
  } else {
    console.error("Failed to update category current_amount:", fetchError);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
