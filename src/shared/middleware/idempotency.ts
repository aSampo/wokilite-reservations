import { Request, Response, NextFunction } from "express";

export function extractIdempotencyKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const key = req.headers["idempotency-key"] as string | undefined;
  (req as any).idempotencyKey = key;
  next();
}

export function requireIdempotencyKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const key = req.headers["idempotency-key"] as string | undefined;
  if (!key) {
    res.status(400).json({
      error: "missing_idempotency_key",
      message: "Idempotency-Key header is required",
    });
    return;
  }
  (req as any).idempotencyKey = key;
  next();
}

