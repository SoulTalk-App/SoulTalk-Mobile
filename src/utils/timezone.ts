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
