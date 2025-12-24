import express from "express";
import { config } from "./config";
import { logger } from "./utils/logger";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  logger.info(`WokiLite server running on port ${config.port}`);
});

export { app };
