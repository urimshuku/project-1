import { upsertUserMarketingOptIn } from "../_shared/upsertUserMarketingOptIn.ts";
import { upsertActivityJoinByEmail } from "./db.ts";
import { sendJoinEmails } from "./email.tsx";
import { validateJoinActivityPayload, z } from "./schema.ts";
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
  const validPath = url.pathname.endsWith("/join-activity") || url.pathname.endsWith("/api/join-activity");
  if (!validPath) {
    return jsonResponse({ error: "Not Found" }, 404);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = await req.json();
    const validated = validateJoinActivityPayload(payload);

    const saveResult = await upsertActivityJoinByEmail(validated.input);
    const joinRow = saveResult.joinRow;
    try {
      await upsertUserMarketingOptIn(validated.input.email, validated.input.marketingOptIn, {
        displayName: validated.input.fullName,
      });
    } catch (userErr) {
      console.error("join-activity: join saved but users marketing_opt_in upsert failed:", userErr);
    }
    const message = saveResult.alreadySignedUp
      ? "You're already signed up. We updated your previous request."
      : undefined;

    try {
      await sendJoinEmails(joinRow);
    } catch (emailErr) {
      console.error("join-activity: saved but email failed:", emailErr);
      return jsonResponse(
        {
          success: true,
          joinId: joinRow.id,
          createdAt: joinRow.created_at,
          message,
          alreadySignedUp: saveResult.alreadySignedUp,
          updatedExisting: saveResult.updatedExisting,
          emailSent: false,
        },
        201,
      );
    }

    return jsonResponse(
      {
        success: true,
        joinId: joinRow.id,
        createdAt: joinRow.created_at,
        message,
        alreadySignedUp: saveResult.alreadySignedUp,
        updatedExisting: saveResult.updatedExisting,
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

    console.error("join-activity error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
