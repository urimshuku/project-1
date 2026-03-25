export interface BookVenueRequestBody {
  dates: string | string[];
  startTime: string;
  endTime: string;
  fullName: string;
  phone: string;
  activityType: string;
  groupSize: number;
  notes?: string;
  email: string;
  /**
   * Honeypot field for spam protection.
   * Should stay empty; bots often fill it.
   */
  website?: string;
}

export interface ValidatedBookVenueInput {
  dates: string[];
  startTime: string;
  endTime: string;
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
  full_name: string;
  phone: string;
  activity_type: string;
  group_size: number;
  notes: string | null;
  email: string | null;
  created_at: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: Record<string, string[]>;
}

export interface ApiSuccessResponse {
  success: true;
  bookingId: string;
  createdAt: string;
}
