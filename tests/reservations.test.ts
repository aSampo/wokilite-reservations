import { describe, it, expect, beforeEach } from "vitest";
import {
  reservationRepository,
  restaurantRepository,
  sectorRepository,
  tableRepository,
} from "../src/shared/repositories";
import { reservationService } from "../src/modules/reservations/reservation.service";
import { loadSeedData } from "../src/seed";

describe("Reservation System - CORE Tests", () => {
  beforeEach(() => {
    reservationRepository.clear();
    restaurantRepository.clear();
    sectorRepository.clear();
    tableRepository.clear();
    loadSeedData();
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

  describe("7. Concurrency Control (Mutex)", () => {
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
});
