import { Router } from "express";
import { validateQuery } from "../../shared/middleware/validation";
import {
  availabilityQuerySchema,
  AvailabilityQuery,
} from "./availability.schemas";
import { getAvailability } from "./availability.service";
import { logger } from "../../shared/utils/logger";

const router = Router();

router.get("/", validateQuery(availabilityQuerySchema), (req, res) => {
  const query = (req as any).validatedQuery as AvailabilityQuery;
  const requestId = (req as any).requestId;

  logger.info({
    requestId,
    operation: "get_availability",
    restaurantId: query.restaurantId,
    sectorId: query.sectorId,
    date: query.date,
    partySize: query.partySize,
  });

  const result = getAvailability({
    restaurantId: query.restaurantId,
    sectorId: query.sectorId,
    date: query.date,
    partySize: query.partySize,
  });

  if ("error" in result) {
    const statusCode = result.error === "not_found" ? 404 : 400;
    res.status(statusCode).json({
      error: result.error,
      detail: result.message,
    });
    return;
  }

  res.json(result);
});

export default router;
