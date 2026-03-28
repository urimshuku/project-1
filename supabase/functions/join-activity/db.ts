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

export interface UpsertJoinResult {
  joinRow: ActivityJoinRow;
  alreadySignedUp: boolean;
  updatedExisting: boolean;
}

export async function upsertActivityJoinByEmail(input: ValidatedJoinActivityInput): Promise<UpsertJoinResult> {
  const supabase = getSupabaseClient();
  const normalizedEmail = input.email.trim().toLowerCase();

  const { data: existingRows, error: existingError } = await supabase
    .from("activity_joins")
    .select("id, full_name, phone, email, activities, future_activities, created_at")
    .ilike("email", normalizedEmail)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) {
    console.error("activity_joins lookup failed:", existingError.message, existingError.code, existingError.details);
    throw new Error(`Failed to check existing join request: ${existingError.message}`);
  }

  const existing = existingRows?.[0] as ActivityJoinRow | undefined;
  if (!existing) {
    const joinRow = await insertActivityJoin({ ...input, email: normalizedEmail });
    return { joinRow, alreadySignedUp: false, updatedExisting: false };
  }

  const { data: updated, error: updateError } = await supabase
    .from("activity_joins")
    .update({
      full_name: input.fullName,
      phone: input.phone,
      email: normalizedEmail,
      activities: input.activities,
      future_activities: input.futureActivities,
    })
    .eq("id", existing.id)
    .select("id, full_name, phone, email, activities, future_activities, created_at")
    .single();

  if (updateError || !updated) {
    console.error("activity_joins update failed:", updateError?.message, updateError?.code, updateError?.details);
    throw new Error(`Failed to update existing join request: ${updateError?.message ?? "Unknown error"}`);
  }

  return {
    joinRow: updated as ActivityJoinRow,
    alreadySignedUp: true,
    updatedExisting: true,
  };
}
