import { insertBooking } from "./db.ts";
import { sendBookingEmails } from "./email.ts";
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
    const payload = await req.json();
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

    const booking = await insertBooking(validated.input);

    try {
      await sendBookingEmails(booking);
    } catch (emailErr) {
      console.error("book-venue: booking saved but email failed:", emailErr);
      return jsonResponse(
        {
          success: true,
          bookingId: booking.id,
          createdAt: booking.created_at,
          emailSent: false,
        },
        201,
      );
    }

    return jsonResponse(
      {
        success: true,
        bookingId: booking.id,
        createdAt: booking.created_at,
        emailSent: true,
      },
      201,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse(
        {
          error: "Validation failed",
          details: mapZodErrors(error),
        },
        400,
      );
    }

    console.error("book-venue error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
