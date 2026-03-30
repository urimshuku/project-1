import type { UserEmailRow } from "./usersDb.ts";
import { getPublicAppUrl } from "./appUrl.ts";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface EmailFooterLinks {
  html: string;
  text: string;
}

/** Legal / preference links for user-facing emails (omit if no token or no APP_URL). */
export function buildEmailFooterLinks(unsubscribeToken: string | null | undefined): EmailFooterLinks | null {
  const base = getPublicAppUrl();
  const token = (unsubscribeToken ?? "").trim();
  if (!base || !token) return null;

  const unsubscribeUrl = `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
  const prefsUrl = `${base}/email-preferences?token=${encodeURIComponent(token)}`;

  const html = `<p style="font-size:12px;color:#6b7280;margin-top:24px">
If you no longer want to receive these emails,
<a href="${escapeHtml(unsubscribeUrl)}" style="color:#4b5563;text-decoration:underline">unsubscribe here</a>.
You can also <a href="${escapeHtml(prefsUrl)}" style="color:#4b5563;text-decoration:underline">manage email preferences</a>.
</p>`;

  const text = [
    "",
    "—",
    `Unsubscribe: ${unsubscribeUrl}`,
    `Email preferences: ${prefsUrl}`,
  ].join("\n");

  return { html, text };
}

/** Skip user-facing transactional email when they opted out of all mail. */
export function shouldSkipUserEmail(user: UserEmailRow | null): boolean {
  if (!user) return false;
  return user.unsubscribed === true;
}
