import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { removeContact, syncContact } from "./resend.ts";

function getServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}

export interface UpsertUserMarketingOptions {
  supabaseClient?: SupabaseClient;
  /** Shown as Resend contact first/last name when marketing_opt_in is true */
  displayName?: string;
}

/**
 * Upsert public.users by email with marketing_opt_in, then sync Resend Contacts (Edge only).
 * Missing or empty email is a no-op (callers should only pass validated emails).
 */
export async function upsertUserMarketingOptIn(
  email: string,
  marketingOptIn: boolean,
  options?: UpsertUserMarketingOptions,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  const supabase = options?.supabaseClient ?? getServiceClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("users").upsert(
    {
      email: normalized,
      marketing_opt_in: marketingOptIn,
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
