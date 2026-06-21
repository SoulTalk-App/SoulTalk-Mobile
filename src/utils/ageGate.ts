// so-cbhq: client-side age-gate helpers. The BACKEND (so-8544) is the
// authoritative 18+ check and hard-rejects under-18 registration; this is a
// front-end mirror purely for instant UX (block before the network round-trip).
//
// Mirrors backend app/schemas/auth.py::compute_is_18_plus exactly:
// birthday-of-day turns 18 → passes; DOB must be a real, past, >=1900 date.

export interface DobParts {
  month: number; // 1-12
  day: number; // 1-31
  year: number; // full year
}

/** True iff (month, day, year) form a real calendar date. */
export const isValidCalendarDate = ({ month, day, year }: DobParts): boolean => {
  if (!Number.isInteger(month) || !Number.isInteger(day) || !Number.isInteger(year)) {
    return false;
  }
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  // Construct in UTC and verify the components survive normalization (catches
  // e.g. Feb 30 → Mar 2).
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
};

/** Backend-aligned validity: real date, not in the future, year >= 1900. */
export const isValidDob = (parts: DobParts): boolean => {
  if (!isValidCalendarDate(parts)) return false;
  if (parts.year < 1900) return false;
  const today = new Date();
  const dob = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  return dob.getTime() <= todayUtc.getTime();
};

/** Age in whole years as of today (UTC). Assumes a valid date. */
export const ageFromDob = ({ month, day, year }: DobParts): number => {
  const today = new Date();
  const ty = today.getFullYear();
  const tm = today.getMonth() + 1;
  const td = today.getDate();
  let age = ty - year;
  if (tm < month || (tm === month && td < day)) age -= 1;
  return age;
};

export const isAtLeast18 = (parts: DobParts): boolean =>
  isValidDob(parts) && ageFromDob(parts) >= 18;

/** Zero-pad to 2 digits. */
const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Backend wants an ISO `YYYY-MM-DD` string for date_of_birth. */
export const toIsoDate = ({ month, day, year }: DobParts): string =>
  `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;

/** Format raw digit input into an `MM/DD/YYYY` mask as the user types. */
export const maskDobInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 8); // MMDDYYYY
  const mm = digits.slice(0, 2);
  const dd = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  let out = mm;
  if (digits.length >= 2) out += '/' + dd;
  if (digits.length >= 4) out += '/' + yyyy;
  return out;
};

/** Parse an `MM/DD/YYYY` masked string into parts, or null if incomplete. */
export const parseMaskedDob = (masked: string): DobParts | null => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(masked.trim());
  if (!m) return null;
  return { month: Number(m[1]), day: Number(m[2]), year: Number(m[3]) };
};

// so-8544: the neutral wire/UX copy for an under-18 block. Kept in one place so
// the FE renders the same message whether the block is decided client-side or
// surfaced from the backend's 400 rejection. PLACEHOLDER — Chey/Randy finalize.
export const UNDER_18_MESSAGE = 'SoulTalk is for users 18 and older.';

/** Does an arbitrary error message look like the backend's under-18 rejection?
 *  Used to route a backend 400 to the same neutral block screen. */
export const isUnder18Error = (message: string | undefined | null): boolean => {
  if (!message) return false;
  return /\b18\b/.test(message) && /older|and older|18 and/i.test(message);
};
