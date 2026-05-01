/**
 * Lightweight relative-time formatter for ISO timestamps coming off the
 * wire. Avoids pulling in a date library for what's effectively a one-line
 * humanization. (so-3m0)
 *
 *   < 1 min   → "just now"
 *   < 60 min  → "{N} min ago"
 *   < 24 hr   → "{N} hr ago"
 *   < 7 days  → "{N} day(s) ago"
 *   else      → "MMM d"
 *
 * Returns null for empty/invalid input so callers can render an em-dash
 * fallback without their own guard.
 */
export function formatRelativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const target = Date.parse(iso);
  if (Number.isNaN(target)) return null;

  const diffMs = Date.now() - target;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;

  const days = Math.floor(hr / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  const d = new Date(target);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}
