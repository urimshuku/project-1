/**
 * Resend Contacts sync (Edge Functions only — set `RESEND_API_KEY` in Supabase secrets).
 * Does not send email; only creates/updates/removes audience contacts.
 */
import { Resend } from "npm:resend@6.9.4";

function getClient(): Resend | null {
  const key = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!key) {
    console.warn("RESEND_API_KEY not set — Resend contact sync skipped");
    return null;
  }
  return new Resend(key);
}

function splitDisplayName(display?: string): { firstName: string; lastName: string } {
  const s = (display ?? "").trim();
  if (!s) return { firstName: "", lastName: "" };
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function errMessage(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err;
  if (typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return String(err);
}

function looksLikeNotFound(err: unknown): boolean {
  const m = errMessage(err).toLowerCase();
  return m.includes("not found") || m.includes("404") || m.includes("could not find");
}

/**
 * Add or update a marketing contact (subscribed to broadcasts).
 * Tries `create` first; on any failure, attempts `update` by email (covers duplicates).
 */
export async function syncContact(email: string, name?: string): Promise<void> {
  const resend = getClient();
  if (!resend) return;

  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  const { firstName, lastName } = splitDisplayName(name);

  const { error: createErr } = await resend.contacts.create({
    email: normalized,
    firstName,
    lastName,
    unsubscribed: false,
  });

  if (!createErr) {
    console.log("Synced contact:", normalized);
    return;
  }

  const { error: updateErr } = await resend.contacts.update({
    email: normalized,
    firstName,
    lastName,
    unsubscribed: false,
  });

  if (!updateErr) {
    console.log("Synced contact:", normalized);
    return;
  }

  console.error("Resend syncContact failed — create:", createErr, "update:", updateErr);
}

/** Remove contact from Resend audience (no-op if missing API key or contact not found). */
export async function removeContact(email: string): Promise<void> {
  const resend = getClient();
  if (!resend) return;

  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  const { error } = await resend.contacts.remove({ email: normalized });

  if (!error) {
    console.log("Removed Resend contact:", normalized);
    return;
  }

  if (looksLikeNotFound(error)) {
    console.log("Resend remove: contact not in audience:", normalized);
    return;
  }

  console.error("Resend contacts.remove failed:", error);
}
