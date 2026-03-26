import { createClient } from "npm:@supabase/supabase-js@2";
import type { ActivityJoinRow, ValidatedJoinActivityInput } from "./types.ts";

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (add the service role secret to this Edge Function).",
    );
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

export async function insertActivityJoin(input: ValidatedJoinActivityInput): Promise<ActivityJoinRow> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("activity_joins")
    .insert({
      full_name: input.fullName,
      phone: input.phone,
      email: input.email,
      activities: input.activities,
      future_activities: input.futureActivities,
    })
    .select("id, full_name, phone, email, activities, future_activities, created_at")
    .single();

  if (error) {
    console.error("activity_joins insert failed:", error.message, error.code, error.details);
    throw new Error(`Failed to save join request: ${error.message}`);
  }

  return data as ActivityJoinRow;
}
