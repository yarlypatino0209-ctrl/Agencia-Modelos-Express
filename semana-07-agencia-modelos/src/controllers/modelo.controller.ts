import { Request, Response, NextFunction } from 'express';
import * as modeloService from '../services/modelo.service';
import { createModeloSchema, updateModeloSchema } from '../schemas/modelo.schema';

// ============================================
// CONTROLADOR — Modelo (Agencia de Modelos)
// Handlers CRUD: valida con Zod y delega al servicio.
// ============================================

// GET /api/v1/modelos?category=&status=
export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const modelos = await modeloService.getAll({ category, status });
    res.status(200).json({ data: modelos, total: modelos.length });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/modelos/:id
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const modelo = await modeloService.getById(req.params.id as string);
    res.status(200).json({ data: modelo });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/modelos
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = createModeloSchema.parse(req.body);
    const userId = req.user!.sub;
    const modelo = await modeloService.create(dto, userId);
    res.status(201).json({ data: modelo });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/modelos/:id
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = updateModeloSchema.parse(req.body);
    const modelo = await modeloService.update(req.params.id as string, dto);
    res.status(200).json({ data: modelo });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/modelos/:id
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await modeloService.remove(req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
