import { getServiceRoleClient } from "../_shared/supabaseService.ts";

/** Minimal 1×1 transparent GIF. */
const PIXEL_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x04, 0x01, 0x00, 0x3b,
]);

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const validPath =
    url.pathname.endsWith("/track-open") || url.pathname.endsWith("/api/track-open");
  if (!validPath) {
    return new Response("Not Found", { status: 404 });
  }

  const tid = url.searchParams.get("tid")?.trim() ?? "";
  if (tid) {
    try {
      const supabase = getServiceRoleClient();
      const iso = new Date().toISOString();
      await supabase
        .from("email_logs")
        .update({ opened_at: iso })
        .eq("tracking_id", tid)
        .is("opened_at", null);
    } catch (e) {
      console.error("track-open:", e);
    }
  }

  return new Response(PIXEL_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
});
