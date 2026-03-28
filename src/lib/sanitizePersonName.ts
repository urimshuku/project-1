/**
 * Full name fields: booking, join activity, donations.
 * Strips digits and all non-letters (Unicode letters and spaces only).
 */

export function sanitizePersonNameInput(value: string): string {
  return value.replace(/[^\p{L}\s]/gu, '');
}

export const PERSON_NAME_INPUT_ATTRS = {
  type: 'text' as const,
  autoComplete: 'name' as const,
  spellCheck: true as const,
};
