import { z } from "zod";

export const createReservationSchema = z.object({
  restaurantId: z.string().min(1, "restaurantId is required"),
  sectorId: z.string().min(1, "sectorId is required"),
  partySize: z
    .number()
    .int("partySize must be an integer")
    .min(1, "partySize must be at least 1")
    .max(50, "partySize cannot exceed 50"),
  startDateTimeISO: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
      "startDateTimeISO must be ISO 8601 with timezone (e.g., 2025-09-08T20:00:00-03:00)"
    ),
  customer: z.object({
    name: z.string().min(1, "customer.name is required"),
    phone: z.string().min(1, "customer.phone is required"),
    email: z.string().email("customer.email must be a valid email address"),
  }),
  notes: z.string().optional(),
});

export const reservationsDayQuerySchema = z.object({
  restaurantId: z.string().min(1, "restaurantId is required"),
  date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "date must be in YYYY-MM-DD format (e.g., 2025-09-08)"
    ),
  sectorId: z.string().optional(),
  includeCancelled: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

export type CreateReservationBody = z.infer<typeof createReservationSchema>;
export type ReservationsDayQuery = z.infer<typeof reservationsDayQuerySchema>;
