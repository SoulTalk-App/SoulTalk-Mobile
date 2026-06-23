// so-byw: device timezone detection. Used at signup, login, and cold-start
// to keep users.timezone aligned with the device so daily rollovers
// (mood / journal-of-day / streak) fire at the user's local midnight.
//
// Intl.DateTimeFormat is available on RN's Hermes runtime. Old Android
// engines may return undefined; UTC is a safe fallback (matches the BE
// helper's NULL → UTC behavior).
export function getDeviceTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && tz.length > 0 ? tz : 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * so-zmjn: format a Date as a 'YYYY-MM-DD' date_key in the user's timezone.
 *
 * The BE computes date_key in users.timezone for affirmation, mood,
 * journal-of-day, and streak rollovers; the client must match exactly or
 * we end up with cross-tz duplicate-or-missing-day bugs (e.g. UTC says
 * 2026-06-23 while the user's local clock is still 2026-06-22 — the
 * affirmation-mirror "today" check then misses today's row and offers a
 * second reveal). Mirrors the en-CA locale trick JournalContext uses for
 * hasEntryToday so both code paths share the same formatter shape.
 *
 * tz: pass `user?.timezone || getDeviceTimezone() || 'UTC'`. Caller
 * decides the precedence to match its own BE-authoritative fallback.
 */
export function formatLocalDateKey(date: Date, tz: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(date);
}
