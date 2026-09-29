import { Request, Response, NextFunction } from 'express';
import * as modeloService from '../services/modelo.service.js';
import { createModeloSchema, updateModeloSchema } from '../schemas/modelo.schema.js';
import { AppError } from '../errors/AppError.js';

// ============================================
// CONTROLADOR — Modelo (Agencia de Modelos)
// ============================================

// GET /api/v1/modelos — catálogo público de la agencia
export async function getModelos(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Solo se aceptan strings: cualquier objeto (ej. ?status[$gt]=)
    // se descarta, cerrando inyección por query string.
    const category = typeof _req.query.category === 'string' ? _req.query.category : undefined;
    const status = typeof _req.query.status === 'string' ? _req.query.status : undefined;
    const modelos = await modeloService.findAll({ category, status });
    res.json({ data: modelos, total: modelos.length });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/modelos/:id — ficha pública
export async function getModeloById(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const modelo = await modeloService.findById(req.params.id);
    if (!modelo) throw new AppError(404, 'Modelo not found');
    res.json({ data: modelo });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/modelos — requiere autenticación
export async function createModelo(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { body } = createModeloSchema.parse({ body: req.body });
    const modelo = await modeloService.create(body, req.user.sub);
    res.status(201).json({ message: 'Modelo created', data: modelo });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/modelos/:id — dueño de la ficha o admin
export async function updateModelo(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { body } = updateModeloSchema.parse({ body: req.body });
    const modelo = await modeloService.update(
      req.params.id,
      body,
      req.user.sub,
      req.user.role as string
    );

    if (!modelo) throw new AppError(404, 'Modelo not found');
    res.json({ message: 'Modelo updated', data: modelo });
  } catch (err) {
    // Autorización a nivel de recurso: no es dueño ni admin
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return next(new AppError(403, 'You can only update your own modelos'));
    }
    next(err);
  }
}

// DELETE /api/v1/modelos/:id — solo admin (enforced en la ruta)
export async function deleteModelo(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const modelo = await modeloService.remove(req.params.id);
    if (!modelo) throw new AppError(404, 'Modelo not found');
    res.json({ message: 'Modelo deleted' });
  } catch (err) {
    next(err);
  }
}
