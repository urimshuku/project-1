import { nanoid } from "npm:nanoid@5.0.9";

/** URL-safe opaque token for unsubscribe / preferences links (never use email in URLs). */
export function generateUnsubscribeToken(): string {
  return nanoid(32);
}
