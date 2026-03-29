export type BookingMode = "continuous" | "non_continuous";

export interface PerDateTimeEntry {
  date: string;
  startTime: string;
  endTime: string;
}

export interface BookVenueRequestBody {
  bookingMode?: BookingMode;
  /** Continuous: ISO local datetime YYYY-MM-DDTHH:mm */
  startDateTime?: string;
  endDateTime?: string;
  /** Non-continuous */
  dates?: string | string[];
  startTime?: string;
  endTime?: string;
  perDateTimes?: PerDateTimeEntry[] | null;
  fullName: string;
  phone: string;
  activityType: string;
  groupSize: number;
  notes?: string;
  email: string;
  website?: string;
  dryRun?: boolean;
}

export interface ValidatedBookVenueInput {
  bookingMode: BookingMode;
  dates: string[];
  /** Summary times (non-continuous same-for-all, or continuous first/last clock times) */
  startTime: string;
  endTime: string;
  continuousStart: string | null;
  continuousEnd: string | null;
  perDateTimes: PerDateTimeEntry[] | null;
  fullName: string;
  phone: string;
  activityType: string;
  groupSize: number;
  notes: string | null;
  email: string;
}

export interface BookingRow {
  id: string;
  dates: string[];
  start_time: string;
  end_time: string;
  booking_mode: string | null;
  continuous_start: string | null;
  continuous_end: string | null;
  per_date_times: PerDateTimeEntry[] | null;
  full_name: string;
  phone: string;
  activity_type: string;
  group_size: number;
  notes: string | null;
  email: string | null;
  created_at: string;
  approval_token: string;
  approved_at: string | null;
}

export interface ApiErrorResponse {
  error: string;
  details?: Record<string, string[]>;
}

export interface ApiSuccessResponse {
  success: true;
  dryRun?: boolean;
  message?: string;
  bookingId?: string;
  createdAt?: string;
  alreadySignedUp?: boolean;
  updatedExisting?: boolean;
  emailSent?: boolean;
}
