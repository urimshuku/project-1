import { getServiceRoleClient } from "../_shared/supabaseService.ts";
import { getUserByUnsubscribeToken } from "../_shared/usersDb.ts";
import { markContactUnsubscribed } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    url.pathname.endsWith("/unsubscribe-user") || url.pathname.endsWith("/api/unsubscribe-user");
  if (!validPath) {
    return jsonResponse({ error: "Not Found" }, 404);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    let body: { token?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const token = (body.token ?? "").trim();
    if (!token) {
      return jsonResponse({ error: "token is required" }, 400);
    }

    const supabase = getServiceRoleClient();
    const user = await getUserByUnsubscribeToken(supabase, token);
    if (!user) {
      return jsonResponse({ error: "Invalid or expired link" }, 404);
    }

    const now = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("users")
      .update({
        unsubscribed: true,
        marketing_opt_in: false,
        updated_at: now,
      })
      .eq("unsubscribe_token", token);

    if (updErr) {
      console.error("unsubscribe-user: DB update failed:", updErr);
      return jsonResponse({ error: "Could not update preferences" }, 500);
    }

    await markContactUnsubscribed(user.email);
    console.log("User unsubscribed:", user.email);
    return jsonResponse({ success: true }, 200);
  } catch (e) {
    console.error("unsubscribe-user error:", e);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
