import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const incomingId = req.header("X-Request-Id");
  const requestId = incomingId || randomUUID();

  (req as any).requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  next();
}

