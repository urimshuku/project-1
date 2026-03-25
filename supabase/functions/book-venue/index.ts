import { insertBooking } from "./db.ts";
import { sendBookingEmails } from "./email.ts";
import { validateBookVenuePayload, z } from "./schema.ts";
import type { ApiErrorResponse, ApiSuccessResponse } from "./types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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
    const validated = validateBookVenuePayload(payload);
    const booking = await insertBooking(validated);
    await sendBookingEmails(booking);

    return jsonResponse(
      {
        success: true,
        bookingId: booking.id,
        createdAt: booking.created_at,
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
