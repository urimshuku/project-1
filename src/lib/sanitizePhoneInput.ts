/**
 * Phone fields: Host an Activity (BookingPage), Join an Activity (JoinPage).
 * Any new form that asks for a number should use PHONE_INPUT_ATTRS + sanitizePhoneInput.
 */

/** Allow digits and common phone formatting only (no letters). */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^\d+()\s.\-]/g, '');
}

/** Spread onto every `<input>` that collects a phone number. */
export const PHONE_INPUT_ATTRS = {
  type: 'tel' as const,
  inputMode: 'tel' as const,
  autoComplete: 'tel' as const,
};
