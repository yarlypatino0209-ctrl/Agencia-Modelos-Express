import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Errores operacionales de la aplicación
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Errores de validación de Zod → 400 con detalle
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Datos inválidos',
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  // ID de Mongo inválido (CastError) → 400
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: `Valor inválido para el campo ${err.path}` });
    return;
  }

  // Violación de validaciones del schema de Mongoose → 400
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({ error: 'Error de validación', details });
    return;
  }

  // Clave duplicada (ej: code o email único) → 409
  if (typeof err === 'object' && err !== null && 'code' in err && err.code === 11000) {
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue;
    const field = keyValue ? Object.keys(keyValue).join(', ') : 'campo único';
    res.status(409).json({ error: `Ya existe un registro con ese valor en: ${field}` });
    return;
  }

  // Error no controlado → 500 genérico (sin exponer detalles internos)
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
