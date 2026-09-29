import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Operacionales (401, 403, 404, 409...)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Validación Zod → 400 con detalle (sin stack trace)
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  // ID de Mongo inválido → 400
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: `Invalid value for field ${err.path}` });
    return;
  }

  // Validaciones del schema de Mongoose → 400
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({ error: 'Validation failed', details });
    return;
  }

  // Clave duplicada (code/email único) → 409
  if (typeof err === 'object' && err !== null && 'code' in err && err.code === 11000) {
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue;
    const field = keyValue ? Object.keys(keyValue).join(', ') : 'unique field';
    res.status(409).json({ error: `Duplicate value for: ${field}` });
    return;
  }

  // No controlado → 500 genérico (nunca exponer stack trace ni info interna)
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
