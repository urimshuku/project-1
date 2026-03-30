import { nanoid } from "npm:nanoid@5.0.9";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export function getFunctionsV1BaseUrl(): string {
  const u = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "") ?? "";
  return `${u}/functions/v1`;
}

export function createTrackingId(): string {
  return nanoid(24);
}

export async function insertEmailLog(
  supabase: SupabaseClient,
  params: { userId: string | null; emailType: string; trackingId: string },
): Promise<boolean> {
  const { error } = await supabase.from("email_logs").insert({
    user_id: params.userId,
    email_type: params.emailType,
    tracking_id: params.trackingId,
  });
  if (error) {
    console.error("email_logs insert failed:", error.message);
    return false;
  }
  return true;
}

/** Wrap http(s) anchors with track-click; skip already-wrapped URLs. */
export function wrapEmailLinksForTracking(html: string, trackingId: string): string {
  const base = `${getFunctionsV1BaseUrl()}/track-click`;
  return html.replace(
    /href\s*=\s*(["'])((?:https?:\/\/)[^"']+?)\1/gi,
    (_full, quote: string, url: string) => {
      if (url.includes("/track-click?") || url.includes("/track/click?")) {
        return `href=${quote}${url}${quote}`;
      }
      const wrapped = `${base}?tid=${encodeURIComponent(trackingId)}&url=${encodeURIComponent(url)}`;
      return `href=${quote}${wrapped}${quote}`;
    },
  );
}

export function injectOpenTrackingPixel(html: string, trackingId: string): string {
  const src = `${getFunctionsV1BaseUrl()}/track-open?tid=${encodeURIComponent(trackingId)}`;
  const pixel = `<img src="${src}" width="1" height="1" alt="" style="display:none" />`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${pixel}\n</body>`);
  }
  return `${html}\n${pixel}`;
}

export function applyEmailHtmlTracking(html: string, trackingId: string): string {
  return injectOpenTrackingPixel(wrapEmailLinksForTracking(html, trackingId), trackingId);
}
