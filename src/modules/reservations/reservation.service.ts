import { Reservation, Customer } from "../../shared/types";
import {
  restaurantRepository,
  sectorRepository,
  reservationRepository,
} from "../../shared/repositories";
import { generateId } from "../../shared/utils/id";
import { createTimestamps, updateTimestamp } from "../../shared/utils/date";
import { findAvailableTable } from "../availability/table-assignment.service";
import { isWithinServiceWindow } from "../availability/availability.service";
import { addMinutes, parseISO } from "date-fns";
import { config } from "../../config";
import { formatInTimezone } from "../../shared/utils/timezone";

export interface CreateReservationInput {
  restaurantId: string;
  sectorId: string;
  partySize: number;
  startDateTimeISO: string;
  customer: Omit<Customer, "createdAt" | "updatedAt">;
  notes?: string;
}

export interface CreateReservationResult {
  success: boolean;
  reservation?: Reservation;
  error?: {
    code: string;
    message: string;
  };
}

export function createReservation(
  input: CreateReservationInput,
  idempotencyKey?: string
): CreateReservationResult {
  if (idempotencyKey) {
    const existing = reservationRepository.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return { success: true, reservation: existing };
    }
  }

  const restaurant = restaurantRepository.findById(input.restaurantId);
  if (!restaurant) {
    return {
      success: false,
      error: { code: "not_found", message: "Restaurant not found" },
    };
  }

  const sector = sectorRepository.findById(input.sectorId);
  if (!sector) {
    return {
      success: false,
      error: { code: "not_found", message: "Sector not found" },
    };
  }

  if (sector.restaurantId !== restaurant.id) {
    return {
      success: false,
      error: {
        code: "invalid",
        message: "Sector does not belong to restaurant",
      },
    };
  }

  if (!isWithinServiceWindow(input.startDateTimeISO, restaurant)) {
    return {
      success: false,
      error: {
        code: "outside_service_window",
        message: "Requested time is outside service shifts",
      },
    };
  }

  const assignment = findAvailableTable(
    input.sectorId,
    input.startDateTimeISO,
    input.partySize,
    restaurant.timezone
  );

  if (assignment.tableIds.length === 0) {
    return {
      success: false,
      error: {
        code: "no_capacity",
        message:
          assignment.reason ||
          "No available table fits party size at requested time",
      },
    };
  }

  const startDate = parseISO(input.startDateTimeISO);
  const endDate = addMinutes(startDate, config.defaultDurationMinutes);
  const endISO = formatInTimezone(endDate, restaurant.timezone);

  const timestamps = createTimestamps();
  const customerWithTimestamps: Customer = {
    ...input.customer,
    ...timestamps,
  };

  const reservation: Reservation = {
    id: generateId("RES"),
    restaurantId: input.restaurantId,
    sectorId: input.sectorId,
    tableIds: assignment.tableIds,
    partySize: input.partySize,
    startDateTimeISO: input.startDateTimeISO,
    endDateTimeISO: endISO,
    status: "CONFIRMED",
    customer: customerWithTimestamps,
    notes: input.notes,
    ...timestamps,
  };

  const created = reservationRepository.create(reservation, idempotencyKey);

  return { success: true, reservation: created };
}

export function cancelReservation(reservationId: string): boolean {
  const reservation = reservationRepository.findById(reservationId);
  if (!reservation) {
    return false;
  }

  return reservationRepository.delete(reservationId);
}

export function getReservation(reservationId: string): Reservation | undefined {
  return reservationRepository.findById(reservationId);
}

export function getReservationsForDay(
  restaurantId: string,
  date: string,
  sectorId?: string
): Reservation[] {
  if (sectorId) {
    return reservationRepository.findBySectorAndDate(sectorId, date);
  }
  return reservationRepository.findByRestaurantAndDate(restaurantId, date);
}
