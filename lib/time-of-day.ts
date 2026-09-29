// Time-of-day greeting helpers — pure, shared by the server (first paint)
// and the client (the viewer's own clock).

export const TIMEZONE_COOKIE = "nc_tz";

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Hour (0–23) in an IANA time zone, or null if the zone is invalid/unsupported. */
export function hourInTimeZone(timeZone: string, date: Date = new Date()): number | null {
  if (!timeZone || timeZone.length > 64 || !/^[A-Za-z0-9_+\-/]+$/.test(timeZone)) return null;
  try {
    const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(date));
    return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
  } catch {
    return null;
  }
}
