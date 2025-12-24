import express from "express";
import { config } from "./config/index.js";
import { logger } from "./shared/utils/logger.js";
import { loadSeedData } from "./seed/index.js";
import { now } from "./shared/utils/date.js";
import { requestIdMiddleware } from "./shared/middleware/request-id.js";
import availabilityRoutes from "./modules/availability/availability.routes.js";
import reservationsRoutes from "./modules/reservations/reservations.routes.js";

const app = express();

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

loadSeedData();

app.listen(config.port, () => {
  logger.info(`WokiLite server running on port ${config.port}`);
});

export { app };
