/**
 * Market hours utility for the Advisor Intelligence Suite.
 *
 * US equity markets: Monday–Friday, 9:30 AM – 4:00 PM Eastern Time.
 * When markets are closed, there is no value in polling for live quotes —
 * prices don't change. This helper lets the app skip unnecessary API calls
 * during ~81% of the week (after-hours, weekends, holidays).
 *
 * NOTE: This does not account for US market holidays (e.g., July 4, Christmas).
 * A future enhancement could source holiday calendars from an API.
 */

/**
 * Returns true if US equity markets are currently open.
 * Uses the browser's clock, converted to Eastern Time via Intl.DateTimeFormat.
 */
export function isMarketOpen(): boolean {
  const now = new Date();

  // Get current Eastern Time components
  const etFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = etFormatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value; // "Mon", "Tue", etc.
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);

  // Weekend check
  if (weekday === "Sat" || weekday === "Sun") return false;

  // Convert to minutes since midnight for easy comparison
  const minutesSinceMidnight = hour * 60 + minute;
  const marketOpen = 9 * 60 + 30;  // 9:30 AM ET = 570
  const marketClose = 16 * 60;     // 4:00 PM ET = 960

  return minutesSinceMidnight >= marketOpen && minutesSinceMidnight < marketClose;
}
