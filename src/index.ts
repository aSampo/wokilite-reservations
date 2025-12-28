import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import { logger } from "./shared/utils/logger.js";
import { loadSeedData } from "./seed/index.js";
import { now } from "./shared/utils/date.js";
import { requestIdMiddleware } from "./shared/middleware/request-id.js";
import availabilityRoutes from "./modules/availability/availability.routes.js";
import reservationsRoutes from "./modules/reservations/reservations.routes.js";
import restaurantsRoutes from "./modules/restaurants/restaurants.routes.js";

const app = express();

app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Idempotency-Key"],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 86400,
  })
);
app.use(requestIdMiddleware);
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: now(),
    requestId: (req as any).requestId,
  });
});

app.use("/availability", availabilityRoutes);
app.use("/reservations", reservationsRoutes);
app.use("/restaurants", restaurantsRoutes);

loadSeedData()
  .then(() => {
    app.listen(config.port, () => {
      logger.info(`WokiLite server running on port ${config.port}`);
    });
  })
  .catch((error) => {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  });

export { app };
