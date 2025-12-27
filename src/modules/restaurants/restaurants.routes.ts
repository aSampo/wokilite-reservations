import { Router } from "express";
import { validateQuery } from "../../shared/middleware/validation.js";
import {
  restaurantInfoQuerySchema,
  RestaurantInfoQuery,
} from "./restaurant.schemas.js";
import { restaurantService } from "./restaurant.service.js";
import { logger } from "../../shared/utils/logger.js";

const router = Router();

router.get("/info", validateQuery(restaurantInfoQuerySchema), (req, res) => {
  const query = (req as any).validatedQuery as RestaurantInfoQuery;
  const requestId = (req as any).requestId;

  logger.info({
    requestId,
    operation: "get_restaurant_info",
    restaurantId: query.restaurantId,
  });

  const info = restaurantService.getRestaurantInfo(query.restaurantId);

  if (!info) {
    res.status(404).json({
      error: "not_found",
      detail: "Restaurant not found",
    });
    return;
  }

  res.json({
    restaurant: {
      id: info.restaurant.id,
      name: info.restaurant.name,
      timezone: info.restaurant.timezone,
      shifts: info.restaurant.shifts,
    },
    sectors: info.sectors.map((s) => ({
      id: s.id,
      name: s.name,
    })),
  });
});

export default router;
