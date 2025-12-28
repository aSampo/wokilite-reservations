import { describe, it, expect, beforeEach } from "vitest";
import { reservationRepository } from "../src/shared/repositories";
import { reservationService } from "../src/modules/reservations/reservation.service";
import { loadSeedData } from "../src/seed";
import { prisma } from "../src/shared/db/prisma";

describe("Reservation System - CORE Tests", () => {
  beforeEach(async () => {
    // Ensure idempotency_keys table exists
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS idempotency_keys (
          key TEXT NOT NULL PRIMARY KEY,
          reservationId TEXT NOT NULL,
          createdAt TEXT NOT NULL
        )
      `;
    } catch (error) {
      // Table might already exist, ignore error
    }

    await prisma.reservation.deleteMany();
    await prisma.idempotencyKey.deleteMany();
    await prisma.table.deleteMany();
    await prisma.sector.deleteMany();
    await prisma.restaurant.deleteMany();
    await loadSeedData();
  });

  describe("1. Idempotency", () => {
    it("should return the same reservation when using the same Idempotency-Key", async () => {
      const input = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
        notes: "Anniversary",
      };

      const idempotencyKey = "test-key-001";

      const result1 = await reservationService.createReservation(
        input,
        idempotencyKey
      );
      const result2 = await reservationService.createReservation(
        input,
        idempotencyKey
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.reservation?.id).toBe(result2.reservation?.id);
      expect(result1.reservation?.createdAt).toBe(
        result2.reservation?.createdAt
      );
    });

    it("should create different reservations with different Idempotency-Keys", async () => {
      const input = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 2,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "Jane Doe",
          phone: "+54 9 11 5555-5678",
          email: "jane.doe@mail.com",
        },
      };

      const result1 = await reservationService.createReservation(
        input,
        "key-001"
      );
      const result2 = await reservationService.createReservation(
        { ...input, startDateTimeISO: "2025-09-08T21:30:00-03:00" },
        "key-002"
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.reservation?.id).not.toBe(result2.reservation?.id);
    });
  });

  describe("2. Concurrency / Conflict (409)", () => {
    it("should return 409 when trying to book the same slot twice (only one table fits)", async () => {
      const input1 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 6,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const input2 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 6,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "Jane Smith",
          phone: "+54 9 11 5555-5678",
          email: "jane.smith@mail.com",
        },
      };

      const result1 = await reservationService.createReservation(
        input1,
        "key-001"
      );
      const result2 = await reservationService.createReservation(
        input2,
        "key-002"
      );

      expect(result1.success).toBe(true);
      expect(result1.reservation?.tableIds).toContain("T4");

      expect(result2.success).toBe(false);
      expect(result2.error?.code).toBe("no_capacity");
    });

    it("should allow booking different tables in the same sector at the same time", async () => {
      const input1 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 2,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const input2 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "Jane Smith",
          phone: "+54 9 11 5555-5678",
          email: "jane.smith@mail.com",
        },
      };

      const result1 = await reservationService.createReservation(
        input1,
        "key-001"
      );
      const result2 = await reservationService.createReservation(
        input2,
        "key-002"
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.reservation?.tableIds).not.toEqual(
        result2.reservation?.tableIds
      );
    });
  });

  describe("3. Time Boundaries (end-exclusive)", () => {
    it("should allow adjacent reservations that touch at end-exclusive boundary", async () => {
      const input1 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const input2 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T21:30:00-03:00",
        customer: {
          name: "Jane Smith",
          phone: "+54 9 11 5555-5678",
          email: "jane.smith@mail.com",
        },
      };

      const result1 = await reservationService.createReservation(
        input1,
        "key-001"
      );
      const result2 = await reservationService.createReservation(
        input2,
        "key-002"
      );

      expect(result1.success).toBe(true);
      expect(result1.reservation?.endDateTimeISO).toBe(
        "2025-09-08T21:30:00-03:00"
      );

      expect(result2.success).toBe(true);
      expect(result2.reservation?.startDateTimeISO).toBe(
        "2025-09-08T21:30:00-03:00"
      );

      expect(result1.reservation?.tableIds[0]).toBe(
        result2.reservation?.tableIds[0]
      );
    });

    it("should prevent overlapping reservations on the same table", async () => {
      const input1 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 6,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const input2 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 6,
        startDateTimeISO: "2025-09-08T20:30:00-03:00",
        customer: {
          name: "Jane Smith",
          phone: "+54 9 11 5555-5678",
          email: "jane.smith@mail.com",
        },
      };

      const result1 = await reservationService.createReservation(
        input1,
        "key-001"
      );
      const result2 = await reservationService.createReservation(
        input2,
        "key-002"
      );

      expect(result1.success).toBe(true);
      expect(result1.reservation?.tableIds).toContain("T4");

      expect(result2.success).toBe(false);
      expect(result2.error?.code).toBe("no_capacity");
    });
  });

  describe("4. Service Window Validation (422)", () => {
    it("should reject reservations outside service shifts", async () => {
      const input = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T18:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const result = await reservationService.createReservation(
        input,
        "key-001"
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("outside_service_window");
    });

    it("should accept reservations within service shifts", async () => {
      const input = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 2,
        startDateTimeISO: "2025-09-08T12:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const result = await reservationService.createReservation(
        input,
        "key-001"
      );

      expect(result.success).toBe(true);
      expect(result.reservation?.startDateTimeISO).toBe(
        "2025-09-08T12:00:00-03:00"
      );
    });
  });

  describe("5. Customer Data Persistence", () => {
    it("should persist and return customer details", async () => {
      const input = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 2,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
        notes: "Window seat preferred",
      };

      const result = await reservationService.createReservation(
        input,
        "key-001"
      );

      expect(result.success).toBe(true);
      expect(result.reservation?.customer.name).toBe("John Doe");
      expect(result.reservation?.customer.phone).toBe("+54 9 11 5555-1234");
      expect(result.reservation?.customer.email).toBe("john.doe@mail.com");
      expect(result.reservation?.notes).toBe("Window seat preferred");
    });
  });

  describe("6. Timestamps", () => {
    it("should set createdAt and updatedAt on creation", async () => {
      const input = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 2,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const result = await reservationService.createReservation(
        input,
        "key-001"
      );

      expect(result.success).toBe(true);
      expect(result.reservation?.createdAt).toBeDefined();
      expect(result.reservation?.updatedAt).toBeDefined();
      expect(result.reservation?.createdAt).toBe(result.reservation?.updatedAt);
    });
  });

  describe("7. Cancellation", () => {
    it("should cancel a reservation and set status to CANCELLED with cancelledAt", async () => {
      const input = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const createResult = await reservationService.createReservation(
        input,
        "key-001"
      );
      expect(createResult.success).toBe(true);
      const reservationId = createResult.reservation!.id;

      const cancelled = await reservationService.cancelReservation(
        reservationId
      );
      expect(cancelled).toBe(true);

      const reservation = await reservationRepository.findById(reservationId);
      expect(reservation?.status).toBe("CANCELLED");
      expect(reservation?.cancelledAt).toBeDefined();
      expect(reservation?.updatedAt).toBeDefined();
    });

    it("should not return cancelled reservations in getReservation", async () => {
      const input = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const createResult = await reservationService.createReservation(
        input,
        "key-001"
      );
      const reservationId = createResult.reservation!.id;

      await reservationService.cancelReservation(reservationId);

      const retrieved = await reservationService.getReservation(reservationId);
      expect(retrieved).toBeUndefined();
    });

    it("should not return cancelled reservations in daily listing", async () => {
      const input1 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const input2 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 2,
        startDateTimeISO: "2025-09-08T21:30:00-03:00",
        customer: {
          name: "Jane Smith",
          phone: "+54 9 11 5555-5678",
          email: "jane.smith@mail.com",
        },
      };

      const result1 = await reservationService.createReservation(
        input1,
        "key-001"
      );
      const result2 = await reservationService.createReservation(
        input2,
        "key-002"
      );

      await reservationService.cancelReservation(result1.reservation!.id);

      const reservations = await reservationService.getReservationsForDay(
        "R1",
        "2025-09-08"
      );

      expect(reservations.length).toBe(1);
      expect(reservations[0].id).toBe(result2.reservation!.id);
    });

    it("should free up capacity after cancellation", async () => {
      const input = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 6,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const result1 = await reservationService.createReservation(
        input,
        "key-001"
      );
      expect(result1.success).toBe(true);

      const result2 = await reservationService.createReservation(
        input,
        "key-002"
      );
      expect(result2.success).toBe(false);
      expect(result2.error?.code).toBe("no_capacity");

      await reservationService.cancelReservation(result1.reservation!.id);

      const result3 = await reservationService.createReservation(
        input,
        "key-003"
      );
      expect(result3.success).toBe(true);
    });

    it("should return false when trying to cancel non-existent reservation", async () => {
      const cancelled = await reservationService.cancelReservation(
        "NON_EXISTENT"
      );
      expect(cancelled).toBe(false);
    });

    it("should return false when trying to cancel already cancelled reservation", async () => {
      const input = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const createResult = await reservationService.createReservation(
        input,
        "key-001"
      );
      const reservationId = createResult.reservation!.id;

      const firstCancel = await reservationService.cancelReservation(
        reservationId
      );
      expect(firstCancel).toBe(true);

      const secondCancel = await reservationService.cancelReservation(
        reservationId
      );
      expect(secondCancel).toBe(false);
    });
  });

  describe("8. Include Cancelled Reservations", () => {
    it("should not include cancelled reservations by default", async () => {
      const input1 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const input2 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 2,
        startDateTimeISO: "2025-09-08T21:30:00-03:00",
        customer: {
          name: "Jane Smith",
          phone: "+54 9 11 5555-5678",
          email: "jane.smith@mail.com",
        },
      };

      const result1 = await reservationService.createReservation(
        input1,
        "key-001"
      );
      const result2 = await reservationService.createReservation(
        input2,
        "key-002"
      );

      await reservationService.cancelReservation(result1.reservation!.id);

      const reservations = await reservationService.getReservationsForDay(
        "R1",
        "2025-09-08"
      );

      expect(reservations.length).toBe(1);
      expect(reservations[0].id).toBe(result2.reservation!.id);
      expect(reservations[0].status).toBe("CONFIRMED");
    });

    it("should include cancelled reservations when includeCancelled=true", async () => {
      const input1 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const input2 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 2,
        startDateTimeISO: "2025-09-08T21:30:00-03:00",
        customer: {
          name: "Jane Smith",
          phone: "+54 9 11 5555-5678",
          email: "jane.smith@mail.com",
        },
      };

      const result1 = await reservationService.createReservation(
        input1,
        "key-001"
      );
      const result2 = await reservationService.createReservation(
        input2,
        "key-002"
      );

      await reservationService.cancelReservation(result1.reservation!.id);

      const reservations = await reservationService.getReservationsForDay(
        "R1",
        "2025-09-08",
        undefined,
        true
      );

      expect(reservations.length).toBe(2);
      const cancelled = reservations.find((r) => r.status === "CANCELLED");
      const confirmed = reservations.find((r) => r.status === "CONFIRMED");

      expect(cancelled).toBeDefined();
      expect(cancelled?.id).toBe(result1.reservation!.id);
      expect(cancelled?.cancelledAt).toBeDefined();

      expect(confirmed).toBeDefined();
      expect(confirmed?.id).toBe(result2.reservation!.id);
    });

    it("should include cancelled reservations for specific sector when includeCancelled=true", async () => {
      const input1 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const result1 = await reservationService.createReservation(
        input1,
        "key-001"
      );
      await reservationService.cancelReservation(result1.reservation!.id);

      const reservationsWithoutCancelled =
        await reservationService.getReservationsForDay(
          "R1",
          "2025-09-08",
          "S1"
        );
      expect(reservationsWithoutCancelled.length).toBe(0);

      const reservationsWithCancelled =
        await reservationService.getReservationsForDay(
          "R1",
          "2025-09-08",
          "S1",
          true
        );
      expect(reservationsWithCancelled.length).toBe(1);
      expect(reservationsWithCancelled[0].status).toBe("CANCELLED");
      expect(reservationsWithCancelled[0].cancelledAt).toBeDefined();
    });
  });

  describe("9. Concurrency Control (Mutex)", () => {
    it("should prevent double booking with concurrent requests to same slot", async () => {
      const input1 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 6,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const input2 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 6,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "Jane Smith",
          phone: "+54 9 11 5555-5678",
          email: "jane.smith@mail.com",
        },
      };

      const [result1, result2] = await Promise.all([
        reservationService.createReservation(input1, "concurrent-key-001"),
        reservationService.createReservation(input2, "concurrent-key-002"),
      ]);

      const successCount = [result1, result2].filter((r) => r.success).length;
      const failureCount = [result1, result2].filter((r) => !r.success).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      const failedResult = result1.success ? result2 : result1;
      expect(failedResult.error?.code).toBe("no_capacity");
    });

    it("should allow concurrent requests to different slots", async () => {
      const input1 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T20:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const input2 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T21:30:00-03:00",
        customer: {
          name: "Jane Smith",
          phone: "+54 9 11 5555-5678",
          email: "jane.smith@mail.com",
        },
      };

      const [result1, result2] = await Promise.all([
        reservationService.createReservation(input1, "slot-key-001"),
        reservationService.createReservation(input2, "slot-key-002"),
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe("10. Timezone Handling in Daily Queries", () => {
    it("should return only reservations that start on the requested date in restaurant timezone", async () => {
      const input1 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 2,
        startDateTimeISO: "2025-12-28T21:30:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const input2 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 2,
        startDateTimeISO: "2025-12-29T20:00:00-03:00",
        customer: {
          name: "Jane Smith",
          phone: "+54 9 11 5555-5678",
          email: "jane.smith@mail.com",
        },
      };

      await reservationService.createReservation(input1, "tz-key-001");
      await reservationService.createReservation(input2, "tz-key-002");

      const reservationsOn28 = await reservationService.getReservationsForDay(
        "R1",
        "2025-12-28"
      );
      const reservationsOn29 = await reservationService.getReservationsForDay(
        "R1",
        "2025-12-29"
      );

      expect(reservationsOn28.length).toBe(1);
      expect(reservationsOn28[0].startDateTimeISO).toBe(
        "2025-12-28T21:30:00-03:00"
      );

      expect(reservationsOn29.length).toBe(1);
      expect(reservationsOn29[0].startDateTimeISO).toBe(
        "2025-12-29T20:00:00-03:00"
      );
    });

    it("should correctly filter reservations by sector and date in restaurant timezone", async () => {
      const input1 = {
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 2,
        startDateTimeISO: "2025-12-28T23:30:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john.doe@mail.com",
        },
      };

      const input2 = {
        restaurantId: "R1",
        sectorId: "S2",
        partySize: 2,
        startDateTimeISO: "2025-12-29T20:00:00-03:00",
        customer: {
          name: "Jane Smith",
          phone: "+54 9 11 5555-5678",
          email: "jane.smith@mail.com",
        },
      };

      await reservationService.createReservation(input1, "sector-tz-001");
      await reservationService.createReservation(input2, "sector-tz-002");

      const s1ReservationsOn28 = await reservationService.getReservationsForDay(
        "R1",
        "2025-12-28",
        "S1"
      );
      const s2ReservationsOn29 = await reservationService.getReservationsForDay(
        "R1",
        "2025-12-29",
        "S2"
      );

      expect(s1ReservationsOn28.length).toBe(1);
      expect(s1ReservationsOn28[0].sectorId).toBe("S1");
      expect(s1ReservationsOn28[0].startDateTimeISO).toBe(
        "2025-12-28T23:30:00-03:00"
      );

      expect(s2ReservationsOn29.length).toBe(1);
      expect(s2ReservationsOn29[0].sectorId).toBe("S2");
      expect(s2ReservationsOn29[0].startDateTimeISO).toBe(
        "2025-12-29T20:00:00-03:00"
      );
    });
  });
});
