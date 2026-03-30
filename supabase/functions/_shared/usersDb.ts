import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface UserEmailRow {
  id: string;
  email: string;
  marketing_opt_in: boolean;
  unsubscribed: boolean;
  unsubscribe_token: string | null;
  email_preferences: Record<string, unknown>;
}

const USER_SELECT =
  "id, email, marketing_opt_in, unsubscribed, unsubscribe_token, email_preferences";

export async function getUserByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<UserEmailRow | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("users")
    .select(USER_SELECT)
    .eq("email", normalized)
    .maybeSingle();

  if (error) {
    console.error("users lookup failed:", error.message);
    return null;
  }
  return data as UserEmailRow | null;
}

export async function getUserByUnsubscribeToken(
  supabase: SupabaseClient,
  token: string,
): Promise<UserEmailRow | null> {
  const t = token.trim();
  if (!t) return null;

  const { data, error } = await supabase
    .from("users")
    .select(USER_SELECT)
    .eq("unsubscribe_token", t)
    .maybeSingle();

  if (error) {
    console.error("users lookup by token failed:", error.message);
    return null;
  }
  return data as UserEmailRow | null;
}
