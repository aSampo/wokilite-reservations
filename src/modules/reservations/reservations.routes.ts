import { Router } from "express";
import {
  validateBody,
  validateQuery,
} from "../../shared/middleware/validation";
import { requireIdempotencyKey } from "../../shared/middleware/idempotency";
import {
  createReservationSchema,
  reservationsDayQuerySchema,
  CreateReservationBody,
  ReservationsDayQuery,
} from "./reservation.schemas";
import { reservationService } from "./reservation.service";
import { logger } from "../../shared/utils/logger";

const router = Router();

router.post(
  "/",
  requireIdempotencyKey,
  validateBody(createReservationSchema),
  async (req, res) => {
    const body = req.body as CreateReservationBody;
    const idempotencyKey = (req as any).idempotencyKey as string;
    const requestId = (req as any).requestId;

    logger.info({
      requestId,
      operation: "create_reservation",
      restaurantId: body.restaurantId,
      sectorId: body.sectorId,
      partySize: body.partySize,
      idempotencyKey,
    });

    const result = await reservationService.createReservation(
      body,
      idempotencyKey
    );

    if (!result.success) {
      let statusCode = 400;
      if (result.error?.code === "not_found") statusCode = 404;
      if (result.error?.code === "no_capacity") statusCode = 409;
      if (result.error?.code === "outside_service_window") statusCode = 422;

      res.status(statusCode).json({
        error: result.error?.code,
        detail: result.error?.message,
      });
      return;
    }

    const reservation = result.reservation!;
    res.status(201).json({
      id: reservation.id,
      restaurantId: reservation.restaurantId,
      sectorId: reservation.sectorId,
      tableIds: reservation.tableIds,
      partySize: reservation.partySize,
      start: reservation.startDateTimeISO,
      end: reservation.endDateTimeISO,
      status: reservation.status,
      customer: reservation.customer,
      ...(reservation.notes && { notes: reservation.notes }),
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    });
  }
);

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const requestId = (req as any).requestId;

  logger.info({
    requestId,
    operation: "cancel_reservation",
    reservationId: id,
  });

  const reservation = reservationService.getReservation(id);
  if (!reservation) {
    res.status(404).json({
      error: "not_found",
      detail: "Reservation not found",
    });
    return;
  }

  const deleted = reservationService.cancelReservation(id);
  if (deleted) {
    res.status(204).send();
  } else {
    res.status(500).json({
      error: "internal_error",
      detail: "Failed to cancel reservation",
    });
  }
});

router.get("/day", validateQuery(reservationsDayQuerySchema), (req, res) => {
  const query = (req as any).validatedQuery as ReservationsDayQuery;
  const requestId = (req as any).requestId;

  logger.info({
    requestId,
    operation: "get_reservations_day",
    restaurantId: query.restaurantId,
    date: query.date,
    sectorId: query.sectorId,
  });

  const reservations = reservationService.getReservationsForDay(
    query.restaurantId,
    query.date,
    query.sectorId
  );

  res.json({
    date: query.date,
    items: reservations.map((r) => ({
      id: r.id,
      sectorId: r.sectorId,
      tableIds: r.tableIds,
      partySize: r.partySize,
      start: r.startDateTimeISO,
      end: r.endDateTimeISO,
      status: r.status,
      customer: r.customer,
      ...(r.notes && { notes: r.notes }),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  });
});

export default router;
