import { z } from "npm:zod@3.23.8";
import type { BookVenueRequestBody, ValidatedBookVenueInput } from "./types.ts";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const phoneRegex = /^[+\d()\-\s]{7,30}$/;

const bookVenueSchema = z
  .object({
    dates: z.union([z.string(), z.array(z.string())]),
    startTime: z.string().regex(hhmmRegex, "startTime must be in HH:mm format"),
    endTime: z.string().regex(hhmmRegex, "endTime must be in HH:mm format"),
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
  })
  .superRefine((value, ctx) => {
    if (value.startTime >= value.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endTime must be after startTime",
        path: ["endTime"],
      });
    }
  });

function normalizeDates(input: string | string[]): string[] {
  const values = Array.isArray(input) ? input : [input];
  return values.map((v) => v.trim()).filter(Boolean);
}

export function validateBookVenuePayload(payload: unknown): ValidatedBookVenueInput {
  const parsed = bookVenueSchema.safeParse(payload as BookVenueRequestBody);
  if (!parsed.success) {
    throw parsed.error;
  }

  const value = parsed.data;

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

  return {
    dates: normalizedDates,
    startTime: value.startTime,
    endTime: value.endTime,
    fullName: value.fullName,
    phone: value.phone,
    activityType: value.activityType,
    groupSize: value.groupSize,
    notes: value.notes?.trim() || null,
    email: value.email.trim().toLowerCase(),
  };
}

export { z };
