import { addMinutes, parseISO } from "date-fns";
import { Restaurant } from "../../shared/types";
import { config } from "../../config";
import {
  createDateInTimezone,
  formatInTimezone,
  getLocalTimeString,
  isTimeInRange,
} from "../../shared/utils/timezone";
import {
  restaurantRepository,
  sectorRepository,
} from "../../shared/repositories";
import { findAvailableTable } from "../../shared/services/table-assignment.service";

export interface TimeSlot {
  start: string;
  available: boolean;
  tables?: string[];
  reason?: string;
}

export interface AvailabilityResponse {
  slotMinutes: number;
  durationMinutes: number;
  slots: TimeSlot[];
}

export interface GetAvailabilityInput {
  restaurantId: string;
  sectorId: string;
  date: string;
  partySize: number;
}

export function generateSlotsForDate(
  date: string,
  restaurant: Restaurant
): Date[] {
  const slots: Date[] = [];

  // TODO: Consider filtering slots where reservation end time would exceed shift end
  // Example: Shift ends at 16:00, slot at 15:45 would end at 17:15 (90min duration)
  // Current behavior: Allows booking at 15:45 even if it exceeds shift end time

  if (!restaurant.shifts || restaurant.shifts.length === 0) {
    const dayStart = createDateInTimezone(date, "00:00", restaurant.timezone);
    const dayEnd = createDateInTimezone(date, "23:59", restaurant.timezone);

    let current = dayStart;
    while (current < dayEnd) {
      slots.push(current);
      current = addMinutes(current, config.slotMinutes);
    }
    return slots;
  }

  for (const shift of restaurant.shifts) {
    const shiftStart = createDateInTimezone(
      date,
      shift.start,
      restaurant.timezone
    );
    const shiftEnd = createDateInTimezone(date, shift.end, restaurant.timezone);

    let current = shiftStart;
    while (current < shiftEnd) {
      slots.push(current);
      current = addMinutes(current, config.slotMinutes);
    }
  }

  return slots;
}

export function isWithinServiceWindow(
  startISO: string,
  restaurant: Restaurant
): boolean {
  if (!restaurant.shifts || restaurant.shifts.length === 0) {
    return true;
  }

  const localTime = getLocalTimeString(startISO, restaurant.timezone);

  return restaurant.shifts.some((shift) =>
    isTimeInRange(localTime, shift.start, shift.end)
  );
}

export function formatSlot(slot: Date, timezone: string): string {
  return formatInTimezone(slot, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

export function getAvailability(
  input: GetAvailabilityInput
): AvailabilityResponse | { error: string; message: string } {
  const restaurant = restaurantRepository.findById(input.restaurantId);
  if (!restaurant) {
    return { error: "not_found", message: "Restaurant not found" };
  }

  const sector = sectorRepository.findById(input.sectorId);
  if (!sector) {
    return { error: "not_found", message: "Sector not found" };
  }

  if (sector.restaurantId !== restaurant.id) {
    return {
      error: "invalid",
      message: "Sector does not belong to restaurant",
    };
  }

  const slotDates = generateSlotsForDate(input.date, restaurant);
  const slots: TimeSlot[] = [];

  for (const slotDate of slotDates) {
    const slotISO = formatSlot(slotDate, restaurant.timezone);

    const assignment = findAvailableTable(
      input.sectorId,
      slotISO,
      input.partySize,
      restaurant.timezone
    );

    if (assignment.tableIds.length > 0) {
      slots.push({
        start: slotISO,
        available: true,
        tables: assignment.tableIds,
      });
    } else {
      slots.push({
        start: slotISO,
        available: false,
        reason: assignment.reason || "no_capacity",
      });
    }
  }

  return {
    slotMinutes: config.slotMinutes,
    durationMinutes: config.defaultDurationMinutes,
    slots,
  };
}
