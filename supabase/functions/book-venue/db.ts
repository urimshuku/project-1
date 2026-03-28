import { createClient } from "npm:@supabase/supabase-js@2";
import type { BookingRow, PerDateTimeEntry, ValidatedBookVenueInput } from "./types.ts";

interface BookingInsertRow {
  dates: string[];
  start_time: string;
  end_time: string;
  booking_mode: string;
  continuous_start: string | null;
  continuous_end: string | null;
  per_date_times: PerDateTimeEntry[] | null;
  full_name: string;
  phone: string;
  activity_type: string;
  group_size: number;
  notes: string | null;
  email: string;
  approval_token: string;
}

const BOOKING_SELECT =
  "id, dates, start_time, end_time, booking_mode, continuous_start, continuous_end, per_date_times, full_name, phone, activity_type, group_size, notes, email, created_at, approval_token, approved_at";

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

function rowFromInput(input: ValidatedBookVenueInput, approvalToken: string): BookingInsertRow {
  return {
    dates: input.dates,
    start_time: input.startTime,
    end_time: input.endTime,
    booking_mode: input.bookingMode,
    continuous_start: input.continuousStart,
    continuous_end: input.continuousEnd,
    per_date_times: input.perDateTimes,
    full_name: input.fullName,
    phone: input.phone,
    activity_type: input.activityType,
    group_size: input.groupSize,
    notes: input.notes,
    email: input.email,
    approval_token: approvalToken,
  };
}

export async function insertBooking(input: ValidatedBookVenueInput): Promise<BookingRow> {
  const supabase = getSupabaseClient();
  const token = crypto.randomUUID();
  const row = rowFromInput(input, token);

  const { data, error } = await supabase.from("bookings").insert(row).select(BOOKING_SELECT).single();

  if (error) {
    console.error("bookings insert failed:", error.message, error.code, error.details);
    throw new Error(`Failed to save booking: ${error.message}`);
  }

  return data as BookingRow;
}

export interface UpsertBookingResult {
  booking: BookingRow;
  alreadySignedUp: boolean;
  updatedExisting: boolean;
}

export async function upsertBookingByEmail(input: ValidatedBookVenueInput): Promise<UpsertBookingResult> {
  const supabase = getSupabaseClient();
  const normalizedEmail = input.email.trim().toLowerCase();

  const { data: existingRows, error: existingError } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .ilike("email", normalizedEmail)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) {
    console.error("bookings lookup failed:", existingError.message, existingError.code, existingError.details);
    throw new Error(`Failed to check existing booking: ${existingError.message}`);
  }

  const existing = existingRows?.[0] as BookingRow | undefined;
  if (!existing) {
    const booking = await insertBooking({ ...input, email: normalizedEmail });
    return { booking, alreadySignedUp: false, updatedExisting: false };
  }

  const { error: clearBlocksError } = await supabase
    .from("venue_blocked_dates")
    .delete()
    .eq("booking_id", existing.id);
  if (clearBlocksError) {
    console.error("bookings clear blocks failed:", clearBlocksError.message);
    throw new Error(`Failed to update booking calendar blocks: ${clearBlocksError.message}`);
  }

  const newToken = crypto.randomUUID();
  const row = rowFromInput({ ...input, email: normalizedEmail }, newToken);

  const { data: updated, error: updateError } = await supabase
    .from("bookings")
    .update({
      dates: row.dates,
      start_time: row.start_time,
      end_time: row.end_time,
      booking_mode: row.booking_mode,
      continuous_start: row.continuous_start,
      continuous_end: row.continuous_end,
      per_date_times: row.per_date_times,
      full_name: row.full_name,
      phone: row.phone,
      activity_type: row.activity_type,
      group_size: row.group_size,
      notes: row.notes,
      email: normalizedEmail,
      approval_token: row.approval_token,
      approved_at: null,
    })
    .eq("id", existing.id)
    .select(BOOKING_SELECT)
    .single();

  if (updateError || !updated) {
    console.error("bookings update failed:", updateError?.message, updateError?.code, updateError?.details);
    throw new Error(`Failed to update existing booking: ${updateError?.message ?? "Unknown error"}`);
  }

  return {
    booking: updated as BookingRow,
    alreadySignedUp: true,
    updatedExisting: true,
  };
}
