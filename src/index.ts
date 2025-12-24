import express from "express";
import { config } from "./config";
import { logger } from "./shared/utils/logger";
import { loadSeedData } from "./seed";
import { now } from "./shared/utils/date";
import { requestIdMiddleware } from "./shared/middleware/request-id";
import availabilityRoutes from "./modules/availability/availability.routes";
import reservationsRoutes from "./modules/reservations/reservations.routes";

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
