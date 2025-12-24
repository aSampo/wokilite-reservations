import { formatISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export function now(): string {
  return formatISO(new Date());
}

export function nowInTimezone(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

export function createTimestamps() {
  const timestamp = now();
  return {
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateTimestamp(existing: { createdAt: string }) {
  return {
    createdAt: existing.createdAt,
    updatedAt: now(),
  };
}
