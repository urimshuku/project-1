import { getPublicAppUrl } from "../_shared/appUrl.ts";
import { getServiceRoleClient } from "../_shared/supabaseService.ts";

function safeHttpUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function fallbackRedirect(): string {
  const b = getPublicAppUrl();
  return b || "https://www.studiospace.community";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const validPath =
    url.pathname.endsWith("/track-click") || url.pathname.endsWith("/api/track-click");
  if (!validPath) {
    return new Response("Not Found", { status: 404 });
  }

  const tid = url.searchParams.get("tid")?.trim() ?? "";
  const rawParam = url.searchParams.get("url");
  let decoded = "";
  if (rawParam != null) {
    try {
      decoded = decodeURIComponent(rawParam);
    } catch {
      decoded = rawParam;
    }
  }

  const target = safeHttpUrl(decoded) ?? fallbackRedirect();

  if (tid && safeHttpUrl(decoded)) {
    try {
      const supabase = getServiceRoleClient();
      const iso = new Date().toISOString();
      await supabase
        .from("email_logs")
        .update({ clicked_at: iso })
        .eq("tracking_id", tid)
        .is("clicked_at", null);
    } catch (e) {
      console.error("track-click:", e);
    }
  }

  return Response.redirect(target, 302);
});
