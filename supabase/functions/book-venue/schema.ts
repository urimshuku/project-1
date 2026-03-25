import { z } from "npm:zod@3.23.8";
import type { BookVenueRequestBody, ValidatedBookVenueInput } from "./types.ts";

export interface BookVenueValidationResult {
  input: ValidatedBookVenueInput;
  dryRun: boolean;
}

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
/** Accepts HH:mm as from `<input type="time">` (may be single-digit hour, e.g. 9:30). */
const hhmmRegex = /^(?:[01]\d|2[0-3]|[0-9]):[0-5]\d$/;
const phoneRegex = /^[+\d()\-\s]{7,30}$/;

function normalizeTimeToHHmm(t: string): string {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return t.trim();
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = m[2].padStart(2, '0').slice(0, 2);
  return `${String(h).padStart(2, '0')}:${min}`;
}

const bookVenueSchema = z.object({
    dates: z.union([z.string(), z.array(z.string())]),
    startTime: z.string().min(1, "startTime is required"),
    endTime: z.string().min(1, "endTime is required"),
    fullName: z.string().trim().min(2, "fullName is required").max(120, "fullName is too long"),
    phone: z
      .string()
      .trim()
      .min(7, "phone is required")
      .max(30, "phone is too long")
      .regex(phoneRegex, "phone contains invalid characters"),
    activityType: z
      .string()
      .trim()
      .min(2, "activityType is required")
      .max(120, "activityType is too long"),
    groupSize: z.coerce
      .number({ invalid_type_error: "groupSize must be a number" })
      .int("groupSize must be an integer")
      .min(1, "groupSize must be at least 1")
      .max(2000, "groupSize is too large"),
    notes: z.string().trim().max(1000, "notes is too long").optional(),
    email: z
      .string()
      .trim()
      .min(1, "email is required")
      .email("email must be valid")
      .max(254, "email is too long"),
    website: z.string().optional(),
    dryRun: z.boolean().optional(),
  });

function normalizeDates(input: string | string[]): string[] {
  const values = Array.isArray(input) ? input : [input];
  return values.map((v) => v.trim()).filter(Boolean);
}

/** Local instant from YYYY-MM-DD + HH:mm (aligned with browser local parsing). */
function localDateTimeMs(isoDate: string, hhmm: string): number {
  const [y, mo, day] = isoDate.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  return new Date(y, mo - 1, day, h, min, 0, 0).getTime();
}

export function validateBookVenuePayload(payload: unknown): ValidatedBookVenueInput {
  const parsed = bookVenueSchema.safeParse(payload as BookVenueRequestBody);
  if (!parsed.success) {
    throw parsed.error;
  }

  const value = parsed.data;
  const startTime = normalizeTimeToHHmm(value.startTime);
  const endTime = normalizeTimeToHHmm(value.endTime);
  if (!hhmmRegex.test(startTime) || !hhmmRegex.test(endTime)) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: "startTime and endTime must be in HH:mm format",
        path: ["startTime"],
      },
    ]);
  }

  // Basic spam-protection placeholder:
  // TODO: verify reCAPTCHA token server-side before processing bookings.
  if ((value.website ?? "").trim().length > 0) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: "Spam protection triggered",
        path: ["website"],
      },
    ]);
  }

  const normalizedDates = normalizeDates(value.dates);
  if (normalizedDates.length === 0) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: "dates is required",
        path: ["dates"],
      },
    ]);
  }

  const invalidDate = normalizedDates.find((d) => !isoDateRegex.test(d));
  if (invalidDate) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: `Invalid date format: ${invalidDate}. Expected YYYY-MM-DD`,
        path: ["dates"],
      },
    ]);
  }

  const sortedDates = [...normalizedDates].sort();
  if (sortedDates.length === 1) {
    if (startTime >= endTime) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: "endTime must be after startTime",
          path: ["endTime"],
        },
      ]);
    }
  } else {
    const startMs = localDateTimeMs(sortedDates[0], startTime);
    const endMs = localDateTimeMs(sortedDates[sortedDates.length - 1], endTime);
    if (endMs <= startMs) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message:
            "endTime on the last day must be after startTime on the first day",
          path: ["endTime"],
        },
      ]);
    }
  }

  const dryRun = Boolean(value.dryRun);

  return {
    dryRun,
    input: {
      dates: sortedDates,
      startTime,
      endTime,
      fullName: value.fullName,
      phone: value.phone,
      activityType: value.activityType,
      groupSize: value.groupSize,
      notes: value.notes?.trim() || null,
      email: value.email.trim().toLowerCase(),
    },
  };
}

export { z };
