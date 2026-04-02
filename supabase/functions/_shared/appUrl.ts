/**
 * Public site origin for links in emails (e.g. https://www.studiospace.community).
 * Set in Supabase Dashboard → Edge Functions → Secrets:
 *   PUBLIC_APP_URL  (or APP_URL)
 * Must match where the SPA is served (no trailing slash). If unset, unsubscribe links are omitted from emails.
 */
export function getPublicAppUrl(): string {
  const raw = Deno.env.get("PUBLIC_APP_URL")?.trim() || Deno.env.get("APP_URL")?.trim() || "";
  return raw.replace(/\/$/, "");
}
