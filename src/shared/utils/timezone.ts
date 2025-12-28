import { parseISO, format, parse } from "date-fns";
import { toZonedTime, formatInTimeZone, fromZonedTime } from "date-fns-tz";

export function formatInTimezone(
  date: Date,
  timezone: string,
  formatStr: string = "yyyy-MM-dd'T'HH:mm:ssXXX"
): string {
  return formatInTimeZone(date, timezone, formatStr);
}

export function createDateInTimezone(
  dateStr: string,
  timeStr: string,
  timezone: string
): Date {
  const dateTimeStr = `${dateStr}T${timeStr}:00`;
  const localDate = parse(dateTimeStr, "yyyy-MM-dd'T'HH:mm:ss", new Date());
  return fromZonedTime(localDate, timezone);
}

export function getLocalTimeString(
  isoString: string,
  timezone: string
): string {
  const zonedDate = toZonedTime(parseISO(isoString), timezone);
  return format(zonedDate, "HH:mm");
}

export function isTimeInRange(
  timeStr: string,
  startTime: string,
  endTime: string
): boolean {
  return timeStr >= startTime && timeStr < endTime;
}

export function getLocalDateString(
  isoString: string,
  timezone: string
): string {
  const zonedDate = toZonedTime(parseISO(isoString), timezone);
  return format(zonedDate, "yyyy-MM-dd");
}
