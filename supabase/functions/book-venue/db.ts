import { createClient } from "npm:@supabase/supabase-js@2";
import type { BookingRow, ValidatedBookVenueInput } from "./types.ts";

interface BookingInsertRow {
  dates: string[];
  start_time: string;
  end_time: string;
  full_name: string;
  phone: string;
  activity_type: string;
  group_size: number;
  notes: string | null;
  email: string;
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const supabaseKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ||
    Deno.env.get("SUPABASE_ANON_KEY")?.trim();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL and/or Supabase key");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

export async function insertBooking(input: ValidatedBookVenueInput): Promise<BookingRow> {
  const supabase = getSupabaseClient();

  const row: BookingInsertRow = {
    dates: input.dates,
    start_time: input.startTime,
    end_time: input.endTime,
    full_name: input.fullName,
    phone: input.phone,
    activity_type: input.activityType,
    group_size: input.groupSize,
    notes: input.notes,
    email: input.email,
  };

  const { data, error } = await supabase
    .from("bookings")
    .insert(row)
    .select(
      "id, dates, start_time, end_time, full_name, phone, activity_type, group_size, notes, email, created_at",
    )
    .single();

  if (error) {
    console.error("bookings insert failed:", error);
    throw new Error("Failed to save booking");
  }

  return data as BookingRow;
}
