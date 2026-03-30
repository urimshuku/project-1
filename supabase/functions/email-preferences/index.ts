import { getServiceRoleClient } from "../_shared/supabaseService.ts";
import { getUserByUnsubscribeToken } from "../_shared/usersDb.ts";
import { removeContact, syncContact } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const validPath =
    url.pathname.endsWith("/email-preferences") || url.pathname.endsWith("/api/email-preferences");
  if (!validPath) {
    return jsonResponse({ error: "Not Found" }, 404);
  }

  const supabase = getServiceRoleClient();

  if (req.method === "GET") {
    const token = (url.searchParams.get("token") ?? "").trim();
    if (!token) {
      return jsonResponse({ error: "token is required" }, 400);
    }
    const user = await getUserByUnsubscribeToken(supabase, token);
    if (!user) {
      return jsonResponse({ error: "Invalid or expired link" }, 404);
    }
    const prefs =
      user.email_preferences && typeof user.email_preferences === "object" && !Array.isArray(user.email_preferences)
        ? user.email_preferences
        : {};
    return jsonResponse(
      {
        marketing_opt_in: user.marketing_opt_in,
        unsubscribed: user.unsubscribed,
        email_preferences: prefs,
      },
      200,
    );
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    let body: {
      token?: string;
      marketingOptIn?: boolean;
      marketing_opt_in?: boolean;
      email_preferences?: Record<string, unknown>;
    };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const token = (body.token ?? "").trim();
    if (!token) {
      return jsonResponse({ error: "token is required" }, 400);
    }

    const marketingOptIn =
      typeof body.marketingOptIn === "boolean"
        ? body.marketingOptIn
        : typeof body.marketing_opt_in === "boolean"
          ? body.marketing_opt_in
          : undefined;
    if (marketingOptIn === undefined) {
      return jsonResponse({ error: "marketingOptIn is required" }, 400);
    }

    const user = await getUserByUnsubscribeToken(supabase, token);
    if (!user) {
      return jsonResponse({ error: "Invalid or expired link" }, 404);
    }

    const prevPrefs =
      user.email_preferences && typeof user.email_preferences === "object" && !Array.isArray(user.email_preferences)
        ? { ...(user.email_preferences as Record<string, unknown>) }
        : {};

    const mergedPrefs: Record<string, unknown> = {
      ...prevPrefs,
      ...(body.email_preferences && typeof body.email_preferences === "object" ? body.email_preferences : {}),
    };
    mergedPrefs.events_updates = marketingOptIn;

    const now = new Date().toISOString();
    const unsubscribed = marketingOptIn ? false : user.unsubscribed;

    const { error: updErr } = await supabase
      .from("users")
      .update({
        marketing_opt_in: marketingOptIn,
        email_preferences: mergedPrefs,
        unsubscribed,
        updated_at: now,
      })
      .eq("unsubscribe_token", token);

    if (updErr) {
      console.error("email-preferences: DB update failed:", updErr);
      return jsonResponse({ error: "Could not save preferences" }, 500);
    }

    try {
      if (marketingOptIn) {
        await syncContact(user.email, undefined);
      } else {
        await removeContact(user.email);
      }
    } catch (e) {
      console.error("email-preferences: Resend sync failed (non-fatal):", e);
    }

    console.log("Email preferences updated:", user.email);
    return jsonResponse({ success: true }, 200);
  } catch (e) {
    console.error("email-preferences error:", e);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
