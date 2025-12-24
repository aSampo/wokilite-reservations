import { Reservation } from "../types/index.js";
import { parseISO, startOfDay, endOfDay } from "date-fns";

class ReservationRepository {
  private reservations: Map<string, Reservation> = new Map();
  private idempotencyKeys: Map<string, string> = new Map();

  create(reservation: Reservation, idempotencyKey?: string): Reservation {
    this.reservations.set(reservation.id, reservation);
    if (idempotencyKey) {
      this.idempotencyKeys.set(idempotencyKey, reservation.id);
    }
    return reservation;
  }

  findById(id: string): Reservation | undefined {
    return this.reservations.get(id);
  }

  findByIdempotencyKey(key: string): Reservation | undefined {
    const reservationId = this.idempotencyKeys.get(key);
    if (!reservationId) return undefined;
    return this.reservations.get(reservationId);
  }

  findAll(): Reservation[] {
    return Array.from(this.reservations.values());
  }

  findByRestaurantId(restaurantId: string): Reservation[] {
    return Array.from(this.reservations.values()).filter(
      (reservation) => reservation.restaurantId === restaurantId
    );
  }

  findBySectorId(sectorId: string): Reservation[] {
    return Array.from(this.reservations.values()).filter(
      (reservation) => reservation.sectorId === sectorId
    );
  }

  findByRestaurantAndDate(restaurantId: string, date: string): Reservation[] {
    const dayStart = startOfDay(parseISO(date));
    const dayEnd = endOfDay(parseISO(date));

    return Array.from(this.reservations.values()).filter((reservation) => {
      if (reservation.restaurantId !== restaurantId) return false;
      if (reservation.status === "CANCELLED") return false;

      const resStart = parseISO(reservation.startDateTimeISO);
      return resStart >= dayStart && resStart <= dayEnd;
    });
  }

  findBySectorAndDate(sectorId: string, date: string): Reservation[] {
    const dayStart = startOfDay(parseISO(date));
    const dayEnd = endOfDay(parseISO(date));

    return Array.from(this.reservations.values()).filter((reservation) => {
      if (reservation.sectorId !== sectorId) return false;
      if (reservation.status === "CANCELLED") return false;

      const resStart = parseISO(reservation.startDateTimeISO);
      return resStart >= dayStart && resStart <= dayEnd;
    });
  }

  findOverlapping(
    sectorId: string,
    startISO: string,
    endISO: string,
    excludeId?: string
  ): Reservation[] {
    const start = parseISO(startISO);
    const end = parseISO(endISO);

    return Array.from(this.reservations.values()).filter((reservation) => {
      if (reservation.sectorId !== sectorId) return false;
      if (reservation.status === "CANCELLED") return false;
      if (excludeId && reservation.id === excludeId) return false;

      const resStart = parseISO(reservation.startDateTimeISO);
      const resEnd = parseISO(reservation.endDateTimeISO);

      return resStart < end && resEnd > start;
    });
  }

  update(id: string, reservation: Reservation): Reservation | undefined {
    if (!this.reservations.has(id)) {
      return undefined;
    }
    this.reservations.set(id, reservation);
    return reservation;
  }

  delete(id: string): boolean {
    return this.reservations.delete(id);
  }

  clear(): void {
    this.reservations.clear();
    this.idempotencyKeys.clear();
  }
}

export const reservationRepository = new ReservationRepository();

