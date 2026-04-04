import { z } from "npm:zod@3.23.8";
import { upsertUserMarketingOptIn } from "../_shared/upsertUserMarketingOptIn.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const bodySchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email.").max(254, "Email is too long"),
});

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mapZodErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "body";
    if (!out[key]) out[key] = [];
    out[key].push(issue.message);
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const validPath =
    url.pathname.endsWith("/newsletter-signup") || url.pathname.endsWith("/api/newsletter-signup");
  if (!validPath) {
    return jsonResponse({ error: "Not Found" }, 404);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonResponse(
        { error: "Validation failed", details: mapZodErrors(parsed.error) },
        400,
      );
    }

    await upsertUserMarketingOptIn(parsed.data.email, true, {
      displayName: "Newsletter",
    });

    return jsonResponse({ success: true }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("newsletter-signup:", e);
    return jsonResponse({ error: msg }, 500);
  }
});
