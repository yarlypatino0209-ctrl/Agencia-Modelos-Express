import { Request, Response, NextFunction } from 'express';

export function notFound(_req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({ error: 'Ruta no encontrada' });
}
