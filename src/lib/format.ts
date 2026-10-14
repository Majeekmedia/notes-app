/** Small date helpers for the notes list. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Human-friendly timestamp: "Just now", "5m ago", "3h ago", "Yesterday",
 * "4d ago", then an absolute date beyond a week.
 */
export function formatRelativeDate(timestamp: number): string {
  const elapsed = Date.now() - timestamp;

  if (elapsed < MINUTE) return 'Just now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < 7 * DAY) {
    const days = Math.floor(elapsed / DAY);
    return days === 1 ? 'Yesterday' : `${days}d ago`;
  }

  return new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
