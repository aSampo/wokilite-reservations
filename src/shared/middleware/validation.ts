import { Request, Response, NextFunction } from "express";
import { z, ZodSchema, ZodError, ZodIssue } from "zod";

function formatZodError(error: ZodError): string {
  return error.issues
    .map((err: ZodIssue) => {
      const field = err.path.join(".");
      return `${field}: ${err.message}`;
    })
    .join(", ");
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "validation_error",
          message: formatZodError(error),
          details: error.issues.map((err: ZodIssue) => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
        });
      } else {
        next(error);
      }
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query);
      (req as any).validatedQuery = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "validation_error",
          message: formatZodError(error),
          details: error.issues.map((err: ZodIssue) => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
        });
      } else {
        next(error);
      }
    }
  };
}
