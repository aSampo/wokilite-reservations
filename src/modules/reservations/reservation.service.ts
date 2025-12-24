import { Mutex } from "async-mutex";
import { Reservation, Customer } from "../../shared/types";
import {
  restaurantRepository,
  sectorRepository,
  reservationRepository,
} from "../../shared/repositories";
import { generateId } from "../../shared/utils/id";
import { createTimestamps } from "../../shared/utils/date";
import { findAvailableTable } from "../../shared/services/table-assignment.service";
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

class ReservationService {
  private slotMutexes = new Map<string, Mutex>();

  private getMutex(sectorId: string, startISO: string): Mutex {
    const key = `${sectorId}:${startISO}`;
    if (!this.slotMutexes.has(key)) {
      this.slotMutexes.set(key, new Mutex());
    }
    return this.slotMutexes.get(key)!;
  }

  async createReservation(
    input: CreateReservationInput,
    idempotencyKey?: string
  ): Promise<CreateReservationResult> {
    const mutex = this.getMutex(input.sectorId, input.startDateTimeISO);

    return await mutex.runExclusive(async () => {
      if (idempotencyKey) {
        const existing =
          reservationRepository.findByIdempotencyKey(idempotencyKey);
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
    });
  }

  cancelReservation(reservationId: string): boolean {
    const reservation = reservationRepository.findById(reservationId);
    if (!reservation) {
      return false;
    }

    return reservationRepository.delete(reservationId);
  }

  getReservation(reservationId: string): Reservation | undefined {
    return reservationRepository.findById(reservationId);
  }

  getReservationsForDay(
    restaurantId: string,
    date: string,
    sectorId?: string
  ): Reservation[] {
    if (sectorId) {
      return reservationRepository.findBySectorAndDate(sectorId, date);
    }
    return reservationRepository.findByRestaurantAndDate(restaurantId, date);
  }
}

export const reservationService = new ReservationService();
