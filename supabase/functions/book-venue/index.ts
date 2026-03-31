import { upsertUserMarketingOptIn } from "../_shared/upsertUserMarketingOptIn.ts";
import { upsertBookingByEmail } from "./db.ts";
import { sendBookingEmails } from "./email.tsx";
import { validateBookVenuePayload, z } from "./schema.ts";
import type { ApiErrorResponse, ApiSuccessResponse } from "./types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Booking-Dry-Run",
};

function jsonResponse(body: ApiErrorResponse | ApiSuccessResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mapZodErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "body";
    if (!out[key]) out[key] = [];
    out[key].push(issue.message);
  }
  return out;
}

/** `instanceof z.ZodError` can fail across bundles / isolates in Edge — match Zod’s issues shape. */
function isZodError(error: unknown): error is z.ZodError {
  if (error instanceof z.ZodError) return true;
  return (
    typeof error === "object" &&
    error !== null &&
    Array.isArray((error as { issues?: unknown }).issues)
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const validPath = url.pathname.endsWith("/book-venue") || url.pathname.endsWith("/api/book-venue");
  if (!validPath) {
    return jsonResponse({ error: "Not Found" }, 404);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const headerDryRun = req.headers.get("X-Booking-Dry-Run") === "1";
    const validated = validateBookVenuePayload(payload);
    const dryRun = validated.dryRun || headerDryRun;

    if (dryRun) {
      return jsonResponse(
        {
          success: true,
          dryRun: true,
          message: "Validation only — no booking saved and no email sent.",
        },
        200,
      );
    }

    const saveResult = await upsertBookingByEmail(validated.input);
    const booking = saveResult.booking;
    try {
      await upsertUserMarketingOptIn(validated.input.email, validated.input.marketingOptIn, {
        displayName: validated.input.fullName,
      });
    } catch (userErr) {
      console.error("book-venue: booking saved but users marketing_opt_in upsert failed:", userErr);
    }
    const message = saveResult.alreadySignedUp
      ? "You're already signed up. We updated your previous request."
      : undefined;

    try {
      await sendBookingEmails(booking);
    } catch (emailErr) {
      const safeMessage =
        emailErr instanceof Error ? emailErr.message : typeof emailErr === "string" ? emailErr : "Unknown email error";
      console.error("book-venue: booking saved but email failed:", safeMessage);
      return jsonResponse(
        {
          success: true,
          bookingId: booking.id,
          createdAt: booking.created_at,
          message,
          alreadySignedUp: saveResult.alreadySignedUp,
          updatedExisting: saveResult.updatedExisting,
          emailSent: false,
          emailError: safeMessage,
        },
        201,
      );
    }

    return jsonResponse(
      {
        success: true,
        bookingId: booking.id,
        createdAt: booking.created_at,
        message,
        alreadySignedUp: saveResult.alreadySignedUp,
        updatedExisting: saveResult.updatedExisting,
        emailSent: true,
      },
      201,
    );
  } catch (error) {
    if (isZodError(error)) {
      return jsonResponse(
        {
          error: "Validation failed",
          details: mapZodErrors(error),
        },
        400,
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error("book-venue error:", message, error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
