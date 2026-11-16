/**
 * Phone helpers shared by the auth screens.
 *
 * The API only accepts digits with an optional leading "+", but people type
 * numbers the way they read them: "+234 801 234 5678", "0801-234-5678".
 */

/** Strip everything except digits and a leading "+". */
export function cleanPhone(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

// Must match the backend rule in Mobile-Backend/src/auth/auth.schemas.ts
const NIGERIAN_PHONE = /^(\+234|234|0)[789][01]\d{8}$/;

/** Returns an error message, or undefined if the number is valid. */
export function validatePhone(input: string): string | undefined {
  const phone = cleanPhone(input);
  if (!phone) return 'Phone number is required';
  if (!NIGERIAN_PHONE.test(phone)) return 'Enter a valid Nigerian number, e.g. 0801 234 5678';
  return undefined;
}
