import { Reservation, ReservationStatus } from "../types/index.js";
import { parseISO } from "date-fns";
import { restaurantRepository } from "./restaurant.repository.js";
import { sectorRepository } from "./sector.repository.js";
import { getLocalDateString } from "../utils/timezone.js";
import { prisma } from "../db/prisma.js";

class ReservationRepository {
  async create(
    reservation: Reservation,
    idempotencyKey?: string
  ): Promise<Reservation> {
    const tableIdsJson = JSON.stringify(reservation.tableIds);

    await prisma.$transaction(async (tx) => {
      await tx.reservation.create({
        data: {
          id: reservation.id,
          restaurantId: reservation.restaurantId,
          sectorId: reservation.sectorId,
          tableIds: tableIdsJson,
          partySize: reservation.partySize,
          startDateTimeISO: reservation.startDateTimeISO,
          endDateTimeISO: reservation.endDateTimeISO,
          status: reservation.status,
          customerName: reservation.customer.name,
          customerPhone: reservation.customer.phone,
          customerEmail: reservation.customer.email,
          customerCreatedAt: reservation.customer.createdAt,
          customerUpdatedAt: reservation.customer.updatedAt,
          notes: reservation.notes ?? null,
          cancelledAt: reservation.cancelledAt ?? null,
          createdAt: reservation.createdAt,
          updatedAt: reservation.updatedAt,
        },
      });

      if (idempotencyKey) {
        await tx.idempotencyKey.create({
          data: {
            key: idempotencyKey,
            reservationId: reservation.id,
            createdAt: reservation.createdAt,
          },
        });
      }
    });

    return reservation;
  }

  async findById(id: string): Promise<Reservation | undefined> {
    const result = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!result) return undefined;

    return this.mapToDomain(result);
  }

  async findByIdempotencyKey(key: string): Promise<Reservation | undefined> {
    const idempotency = await prisma.idempotencyKey.findUnique({
      where: { key },
    });

    if (!idempotency) return undefined;

    return this.findById(idempotency.reservationId);
  }

  async findAll(): Promise<Reservation[]> {
    const results = await prisma.reservation.findMany();
    return results.map((r) => this.mapToDomain(r));
  }

  async findByRestaurantId(restaurantId: string): Promise<Reservation[]> {
    const results = await prisma.reservation.findMany({
      where: { restaurantId },
    });
    return results.map((r) => this.mapToDomain(r));
  }

  async findBySectorId(sectorId: string): Promise<Reservation[]> {
    const results = await prisma.reservation.findMany({
      where: { sectorId },
    });
    return results.map((r) => this.mapToDomain(r));
  }

  async findByRestaurantAndDate(
    restaurantId: string,
    date: string,
    includeCancelled = false
  ): Promise<Reservation[]> {
    const restaurant = await restaurantRepository.findById(restaurantId);
    if (!restaurant) return [];

    const allReservations = await prisma.reservation.findMany({
      where: { restaurantId },
    });

    return allReservations
      .map((r) => this.mapToDomain(r))
      .filter((reservation) => {
        if (!includeCancelled && reservation.status === "CANCELLED") {
          return false;
        }

        const reservationLocalDate = getLocalDateString(
          reservation.startDateTimeISO,
          restaurant.timezone
        );
        return reservationLocalDate === date;
      });
  }

  async findBySectorAndDate(
    sectorId: string,
    date: string,
    includeCancelled = false
  ): Promise<Reservation[]> {
    const sector = await sectorRepository.findById(sectorId);
    if (!sector) return [];

    const restaurant = await restaurantRepository.findById(sector.restaurantId);
    if (!restaurant) return [];

    const allReservations = await prisma.reservation.findMany({
      where: { sectorId },
    });

    return allReservations
      .map((r) => this.mapToDomain(r))
      .filter((reservation) => {
        if (!includeCancelled && reservation.status === "CANCELLED") {
          return false;
        }

        const reservationLocalDate = getLocalDateString(
          reservation.startDateTimeISO,
          restaurant.timezone
        );
        return reservationLocalDate === date;
      });
  }

  async findOverlapping(
    sectorId: string,
    startISO: string,
    endISO: string,
    excludeId?: string
  ): Promise<Reservation[]> {
    const start = parseISO(startISO);
    const end = parseISO(endISO);

    const where: any = {
      sectorId,
      status: { not: ReservationStatus.CANCELLED },
      startDateTimeISO: { lt: endISO },
      endDateTimeISO: { gt: startISO },
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const results = await prisma.reservation.findMany({ where });
    return results.map((r) => this.mapToDomain(r));
  }

  async update(
    id: string,
    reservation: Reservation
  ): Promise<Reservation | undefined> {
    const existing = await prisma.reservation.findUnique({ where: { id } });
    if (!existing) return undefined;

    const tableIdsJson = JSON.stringify(reservation.tableIds);

    await prisma.reservation.update({
      where: { id },
      data: {
        tableIds: tableIdsJson,
        partySize: reservation.partySize,
        startDateTimeISO: reservation.startDateTimeISO,
        endDateTimeISO: reservation.endDateTimeISO,
        status: reservation.status,
        customerName: reservation.customer.name,
        customerPhone: reservation.customer.phone,
        customerEmail: reservation.customer.email,
        customerUpdatedAt: reservation.customer.updatedAt,
        notes: reservation.notes ?? null,
        cancelledAt: reservation.cancelledAt ?? null,
        updatedAt: reservation.updatedAt,
      },
    });

    return reservation;
  }

  async cancel(id: string): Promise<Reservation | undefined> {
    const now = new Date().toISOString();
    try {
      const updated = await prisma.reservation.update({
        where: { id },
        data: {
          status: ReservationStatus.CANCELLED,
          cancelledAt: now,
          updatedAt: now,
        },
      });

      return this.mapToDomain(updated);
    } catch (error: any) {
      if (error.code === "P2025") {
        return undefined;
      }
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.reservation.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    await prisma.reservation.deleteMany();
    await prisma.idempotencyKey.deleteMany();
  }

  private mapToDomain(db: {
    id: string;
    restaurantId: string;
    sectorId: string;
    tableIds: string;
    partySize: number;
    startDateTimeISO: string;
    endDateTimeISO: string;
    status: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerCreatedAt: string;
    customerUpdatedAt: string;
    notes: string | null;
    cancelledAt: string | null;
    createdAt: string;
    updatedAt: string;
  }): Reservation {
    return {
      id: db.id,
      restaurantId: db.restaurantId,
      sectorId: db.sectorId,
      tableIds: JSON.parse(db.tableIds),
      partySize: db.partySize,
      startDateTimeISO: db.startDateTimeISO,
      endDateTimeISO: db.endDateTimeISO,
      status: db.status as ReservationStatus,
      customer: {
        name: db.customerName,
        phone: db.customerPhone,
        email: db.customerEmail,
        createdAt: db.customerCreatedAt,
        updatedAt: db.customerUpdatedAt,
      },
      notes: db.notes ?? undefined,
      cancelledAt: db.cancelledAt ?? undefined,
      createdAt: db.createdAt,
      updatedAt: db.updatedAt,
    };
  }
}

export const reservationRepository = new ReservationRepository();
