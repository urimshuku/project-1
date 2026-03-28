export interface JoinActivityRequestBody {
  fullName: string;
  phone?: string;
  email: string;
  activities: string[];
  futureActivities?: string;
}

export interface ValidatedJoinActivityInput {
  fullName: string;
  phone: string | null;
  email: string;
  activities: string[];
  futureActivities: string | null;
}

export interface ActivityJoinRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  activities: string[];
  future_activities: string | null;
  created_at: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: Record<string, string[]>;
}

export interface ApiSuccessResponse {
  success: true;
  joinId?: string;
  createdAt?: string;
  message?: string;
  alreadySignedUp?: boolean;
  updatedExisting?: boolean;
  emailSent?: boolean;
}
