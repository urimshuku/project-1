import { z } from "npm:zod@3.23.8";
import type { BookVenueRequestBody, BookingMode, PerDateTimeEntry, ValidatedBookVenueInput } from "./types.ts";

export interface BookVenueValidationResult {
  input: ValidatedBookVenueInput;
  dryRun: boolean;
}

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const hhmmRegex = /^(?:[01]\d|2[0-3]|[0-9]):[0-5]\d$/;
const dateTimeLocalRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const phoneRegex = /^[+\d()\-\s]{7,30}$/;

function normalizeTimeToHHmm(t: string): string {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (!m) return t.trim();
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = m[2].padStart(2, "0").slice(0, 2);
  return `${String(h).padStart(2, "0")}:${min}`;
}

function dateTimeLocalToMs(s: string): number {
  const [datePart, timePart] = s.trim().split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
}

function enumerateInclusiveDates(startIsoDate: string, endIsoDate: string): string[] {
  const out: string[] = [];
  let cur = new Date(startIsoDate + "T12:00:00");
  const end = new Date(endIsoDate + "T12:00:00");
  while (cur <= end) {
    const y = cur.getFullYear();
    const mo = String(cur.getMonth() + 1).padStart(2, "0");
    const day = String(cur.getDate()).padStart(2, "0");
    out.push(`${y}-${mo}-${day}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

const baseFields = z.object({
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
  recaptchaToken: z.string().optional(),
});

export function validateBookVenuePayload(payload: unknown): BookVenueValidationResult {
  const raw = payload as BookVenueRequestBody;
  const mode: BookingMode = raw.bookingMode === "continuous" ? "continuous" : "non_continuous";

  const parsedBase = baseFields.safeParse(raw);
  if (!parsedBase.success) throw parsedBase.error;

  const v = parsedBase.data;

  if ((v.website ?? "").trim().length > 0) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: "Spam protection triggered",
        path: ["website"],
      },
    ]);
  }

  const dryRun = Boolean(raw.dryRun);

  if (mode === "continuous") {
    const startDt = (raw.startDateTime ?? "").trim();
    const endDt = (raw.endDateTime ?? "").trim();
    if (!dateTimeLocalRegex.test(startDt) || !dateTimeLocalRegex.test(endDt)) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: "startDateTime and endDateTime must be YYYY-MM-DDTHH:mm",
          path: ["startDateTime"],
        },
      ]);
    }
    if (dateTimeLocalToMs(endDt) <= dateTimeLocalToMs(startDt)) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: "End must be after start",
          path: ["endDateTime"],
        },
      ]);
    }
    const startDate = startDt.slice(0, 10);
    const endDate = endDt.slice(0, 10);
    if (!isoDateRegex.test(startDate) || !isoDateRegex.test(endDate)) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: "Invalid date in range",
          path: ["startDateTime"],
        },
      ]);
    }
    const dates = enumerateInclusiveDates(startDate, endDate);
    const startTime = normalizeTimeToHHmm(startDt.slice(11));
    const endTime = normalizeTimeToHHmm(endDt.slice(11));

    return {
      dryRun,
      input: {
        bookingMode: "continuous",
        dates,
        startTime,
        endTime,
        continuousStart: startDt,
        continuousEnd: endDt,
        perDateTimes: null,
        fullName: v.fullName,
        phone: v.phone,
        activityType: v.activityType,
        groupSize: v.groupSize,
        notes: v.notes?.trim() || null,
        email: v.email.trim().toLowerCase(),
      },
    };
  }

  // non_continuous
  const values = Array.isArray(raw.dates) ? raw.dates : raw.dates ? [raw.dates as string] : [];
  const normalizedDates = values.map((x) => String(x).trim()).filter(Boolean);
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

  // Per-day schedule must not require top-level startTime/endTime (checked below for shared-time mode).
  const perRaw = raw.perDateTimes;
  if (Array.isArray(perRaw) && perRaw.length > 0) {
    const entries: PerDateTimeEntry[] = [];
    for (const row of perRaw) {
      const date = String((row as PerDateTimeEntry).date ?? "").trim();
      const st = normalizeTimeToHHmm(String((row as PerDateTimeEntry).startTime ?? ""));
      const et = normalizeTimeToHHmm(String((row as PerDateTimeEntry).endTime ?? ""));
      if (!isoDateRegex.test(date) || !hhmmRegex.test(st) || !hhmmRegex.test(et)) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "perDateTimes entries need date YYYY-MM-DD and HH:mm times",
            path: ["perDateTimes"],
          },
        ]);
      }
      if (st >= et) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "End time must be after start time for each day",
            path: ["perDateTimes"],
          },
        ]);
      }
      entries.push({ date, startTime: st, endTime: et });
    }
    const byDate = new Set(entries.map((e) => e.date));
    const missing = sortedDates.filter((d) => !byDate.has(d));
    if (missing.length) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: "Each selected date needs a time range when using per-day times",
          path: ["perDateTimes"],
        },
      ]);
    }
    if (byDate.size !== entries.length) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: "perDateTimes must have one entry per date (no duplicates)",
          path: ["perDateTimes"],
        },
      ]);
    }
    if (entries.length !== sortedDates.length) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: "perDateTimes must list exactly the selected dates",
          path: ["perDateTimes"],
        },
      ]);
    }

    return {
      dryRun,
      input: {
        bookingMode: "non_continuous",
        dates: sortedDates,
        startTime: entries[0].startTime,
        endTime: entries[entries.length - 1].endTime,
        continuousStart: null,
        continuousEnd: null,
        perDateTimes: entries.sort((a, b) => a.date.localeCompare(b.date)),
        fullName: v.fullName,
        phone: v.phone,
        activityType: v.activityType,
        groupSize: v.groupSize,
        notes: v.notes?.trim() || null,
        email: v.email.trim().toLowerCase(),
      },
    };
  }

  const startTime = normalizeTimeToHHmm(String(raw.startTime ?? ""));
  const endTime = normalizeTimeToHHmm(String(raw.endTime ?? ""));
  if (!hhmmRegex.test(startTime) || !hhmmRegex.test(endTime)) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: "startTime and endTime must be in HH:mm format",
        path: ["startTime"],
      },
    ]);
  }
  if (sortedDates.length === 1 && startTime >= endTime) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: "endTime must be after startTime",
        path: ["endTime"],
      },
    ]);
  }

  return {
    dryRun,
    input: {
      bookingMode: "non_continuous",
      dates: sortedDates,
      startTime,
      endTime,
      continuousStart: null,
      continuousEnd: null,
      perDateTimes: null,
      fullName: v.fullName,
      phone: v.phone,
      activityType: v.activityType,
      groupSize: v.groupSize,
      notes: v.notes?.trim() || null,
      email: v.email.trim().toLowerCase(),
    },
  };
}

export { z };
