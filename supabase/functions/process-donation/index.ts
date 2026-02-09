import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.15.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CheckoutRequest {
  category_id: string;
  donor_name: string;
  amount: number;
  is_anonymous: boolean;
  words_of_support?: string;
  success_url?: string;
  cancel_url?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      timeout: 30000,
      maxNetworkRetries: 2,
    });

    const requestData: CheckoutRequest = await req.json();
    const { category_id, donor_name, amount, is_anonymous, words_of_support, success_url, cancel_url } = requestData;

    const origin = req.headers.get("origin") || "";
    const base = origin.replace(/\/$/, "");
    const success = success_url || `${base}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancel = cancel_url || `${base}/`;

    if (!category_id || !donor_name || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid donation data" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const amountInCents = Math.round(amount * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: donor_name ? `Donation from ${donor_name}` : "Anonymous Donation",
              description: `Support for category donation`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: success,
      cancel_url: cancel,
      metadata: {
        category_id,
        donor_name: is_anonymous ? "Anonymous" : donor_name,
        is_anonymous: is_anonymous.toString(),
        ...(words_of_support && words_of_support.trim().length > 0
          ? { words_of_support: words_of_support.trim().slice(0, 150) }
          : {}),
      },
    });

    const checkoutUrl = session.url;
    if (!checkoutUrl) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        checkoutUrl,
        clientSecret: session.client_secret,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);

    const rawMessage = error instanceof Error ? error.message : "Internal server error";
    const isStripeConnection = /connection to Stripe|StripeConnectionError|retried/i.test(rawMessage);
    const errorMessage = isStripeConnection
      ? "Stripe connection failed. Check that STRIPE_SECRET_KEY is correct (sk_test_... or sk_live_...) in Supabase Function secrets, then try again."
      : rawMessage;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

