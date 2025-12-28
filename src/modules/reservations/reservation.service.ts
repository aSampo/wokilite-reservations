import { Mutex } from "async-mutex";
import {
  Reservation,
  Customer,
  ReservationStatus,
} from "../../shared/types/index.js";
import {
  restaurantRepository,
  sectorRepository,
  reservationRepository,
} from "../../shared/repositories/index.js";
import { generateId } from "../../shared/utils/id.js";
import { createTimestamps } from "../../shared/utils/date.js";
import { findAvailableTable } from "../../shared/services/table-assignment.service.js";
import { isWithinServiceWindow } from "../availability/availability.service.js";
import { addMinutes, parseISO } from "date-fns";
import { config } from "../../config/index.js";
import { formatInTimezone } from "../../shared/utils/timezone.js";

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
          await reservationRepository.findByIdempotencyKey(idempotencyKey);
        if (existing) {
          return { success: true, reservation: existing };
        }
      }

      const restaurant = await restaurantRepository.findById(input.restaurantId);
      if (!restaurant) {
        return {
          success: false,
          error: { code: "not_found", message: "Restaurant not found" },
        };
      }

      const sector = await sectorRepository.findById(input.sectorId);
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

      const assignment = await findAvailableTable(
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
        status: ReservationStatus.CONFIRMED,
        customer: customerWithTimestamps,
        notes: input.notes,
        ...timestamps,
      };

      const created = await reservationRepository.create(
        reservation,
        idempotencyKey
      );

      return { success: true, reservation: created };
    });
  }

  async cancelReservation(reservationId: string): Promise<boolean> {
    const reservation = await reservationRepository.findById(reservationId);
    if (!reservation || reservation.status === ReservationStatus.CANCELLED) {
      return false;
    }

    const cancelled = await reservationRepository.cancel(reservationId);
    return !!cancelled;
  }

  async getReservation(
    reservationId: string
  ): Promise<Reservation | undefined> {
    const reservation = await reservationRepository.findById(reservationId);
    if (!reservation || reservation.status === ReservationStatus.CANCELLED) {
      return undefined;
    }
    return reservation;
  }

  async getReservationsForDay(
    restaurantId: string,
    date: string,
    sectorId?: string,
    includeCancelled = false
  ): Promise<Reservation[]> {
    if (sectorId) {
      return await reservationRepository.findBySectorAndDate(
        sectorId,
        date,
        includeCancelled
      );
    }
    return await reservationRepository.findByRestaurantAndDate(
      restaurantId,
      date,
      includeCancelled
    );
  }
}

export const reservationService = new ReservationService();
