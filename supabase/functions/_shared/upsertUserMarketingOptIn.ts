import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { removeContact, syncContact } from "./resend.ts";
import { getServiceRoleClient } from "./supabaseService.ts";
import { generateUnsubscribeToken } from "./tokens.ts";

export interface UpsertUserMarketingOptions {
  supabaseClient?: SupabaseClient;
  /** Shown as Resend contact first/last name when marketing_opt_in is true */
  displayName?: string;
}

/**
 * Upsert public.users by email with marketing_opt_in, then sync Resend Contacts (Edge only).
 * Ensures unsubscribe_token exists (never expose email in URLs — token only).
 * Missing or empty email is a no-op (callers should only pass validated emails).
 */
export async function upsertUserMarketingOptIn(
  email: string,
  marketingOptIn: boolean,
  options?: UpsertUserMarketingOptions,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  const supabase = options?.supabaseClient ?? getServiceRoleClient();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("users")
    .select("unsubscribe_token, unsubscribed, email_preferences")
    .eq("email", normalized)
    .maybeSingle();

  const existingRow = existing as {
    unsubscribe_token: string | null;
    unsubscribed: boolean;
    email_preferences: unknown;
  } | null;

  const token =
    (existingRow?.unsubscribe_token && existingRow.unsubscribe_token.trim()) || generateUnsubscribeToken();

  /** Opting back into marketing clears a prior global unsubscribe. */
  const unsubscribed = marketingOptIn ? false : Boolean(existingRow?.unsubscribed);

  const emailPrefs =
    existingRow?.email_preferences &&
    typeof existingRow.email_preferences === "object" &&
    !Array.isArray(existingRow.email_preferences)
      ? (existingRow.email_preferences as Record<string, unknown>)
      : {};

  const { error } = await supabase.from("users").upsert(
    {
      email: normalized,
      marketing_opt_in: marketingOptIn,
      unsubscribe_token: token,
      unsubscribed,
      email_preferences: emailPrefs,
      updated_at: now,
    },
    { onConflict: "email" },
  );

  if (error) {
    console.error("users upsert (marketing_opt_in) failed:", error.message, error.code);
    throw new Error(`Failed to save marketing preference: ${error.message}`);
  }

  try {
    if (marketingOptIn) {
      await syncContact(normalized, options?.displayName);
    } else {
      await removeContact(normalized);
    }
  } catch (resendErr) {
    console.error("Resend contact sync failed (non-fatal):", resendErr);
  }
}
