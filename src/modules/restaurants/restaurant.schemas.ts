import { z } from "zod";

export const restaurantInfoQuerySchema = z.object({
  restaurantId: z.string().min(1, "restaurantId is required"),
});

export type RestaurantInfoQuery = z.infer<typeof restaurantInfoQuerySchema>;
