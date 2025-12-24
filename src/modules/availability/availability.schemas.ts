import { z } from "zod";

export const availabilityQuerySchema = z.object({
  restaurantId: z.string().min(1, "restaurantId is required"),
  sectorId: z.string().min(1, "sectorId is required"),
  date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "date must be in YYYY-MM-DD format (e.g., 2025-09-08)"
    ),
  partySize: z.coerce
    .number()
    .int("partySize must be an integer")
    .min(1, "partySize must be at least 1")
    .max(50, "partySize cannot exceed 50"),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
