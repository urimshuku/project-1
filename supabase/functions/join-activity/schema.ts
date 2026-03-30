import { z } from "npm:zod@3.23.8";
import type { JoinActivityRequestBody, ValidatedJoinActivityInput } from "./types.ts";

export interface JoinActivityValidationResult {
  input: ValidatedJoinActivityInput;
}

const joinActivitySchema = z.object({
  fullName: z.string().trim().min(2, "fullName is required").max(120, "fullName is too long"),
  phone: z.string().trim().max(30, "phone is too long").optional(),
  email: z.string().trim().min(1, "email is required").email("email must be valid").max(254, "email is too long"),
  activities: z.array(z.string().trim().min(1)).min(1, "Select at least one activity"),
  futureActivities: z.string().trim().max(1000, "futureActivities is too long").optional(),
  marketingOptIn: z.boolean().optional().default(false),
});

export function validateJoinActivityPayload(payload: unknown): JoinActivityValidationResult {
  const parsed = joinActivitySchema.safeParse(payload as JoinActivityRequestBody);
  if (!parsed.success) {
    throw parsed.error;
  }

  const value = parsed.data;

  return {
    input: {
      fullName: value.fullName,
      phone: value.phone?.trim() || null,
      email: value.email.trim().toLowerCase(),
      activities: value.activities,
      futureActivities: value.futureActivities?.trim() || null,
      marketingOptIn: value.marketingOptIn,
    },
  };
}

export { z };
