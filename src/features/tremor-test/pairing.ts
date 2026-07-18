const MINUTES_TO_MS = 60_000;
const DAY_TO_MS = 24 * 60 * MINUTES_TO_MS;

/**
 * Returns the UTC instants that bound the phone's local calendar day.
 * `timezoneOffsetMinutes` follows Date#getTimezoneOffset (UTC - local time).
 */
export function getLocalDayBounds(
  instant: Date,
  timezoneOffsetMinutes: number,
): { start: Date; end: Date } {
  const shifted = new Date(instant.getTime() - timezoneOffsetMinutes * MINUTES_TO_MS);
  const localMidnightAsUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
  const start = new Date(localMidnightAsUtc + timezoneOffsetMinutes * MINUTES_TO_MS);

  return { start, end: new Date(start.getTime() + DAY_TO_MS) };
}
