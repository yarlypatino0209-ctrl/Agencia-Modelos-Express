import mongoose from 'mongoose';
import { IModelo } from '../models/modelo.model';
import * as modeloRepository from '../repositories/modelo.repository';
import { CreateModeloDto, UpdateModeloDto } from '../schemas/modelo.schema';
import { AppError } from '../errors/AppError';

// ============================================
// SERVICIO — Modelo (Agencia de Modelos)
// Lógica de negocio del recurso principal.
// ============================================

const MIN_AGE = 14; // Edad mínima para registrar un/a modelo

function ensureValidObjectId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, 'El ID proporcionado no es válido');
  }
}

function ensureMinimumAge(birthDate: string | Date): void {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  if (age < MIN_AGE) {
    throw new AppError(400, `El/la modelo debe tener al menos ${MIN_AGE} años`);
  }
}

export async function getAll(filters?: {
  category?: string;
  status?: string;
}): Promise<IModelo[]> {
  return modeloRepository.findAll(filters ?? {});
}

export async function getById(id: string): Promise<IModelo> {
  ensureValidObjectId(id);
  const modelo = await modeloRepository.findById(id);
  if (!modelo) {
    throw new AppError(404, 'Modelo no encontrado');
  }
  return modelo;
}

export async function create(dto: CreateModeloDto, userId: string): Promise<IModelo> {
  // Regla de negocio: el código de agencia debe ser único
  const existing = await modeloRepository.findByCode(dto.code);
  if (existing) {
    throw new AppError(409, `Ya existe un modelo con el código ${dto.code.toUpperCase()}`);
  }

  // Regla de negocio: edad mínima permitida
  ensureMinimumAge(dto.birthDate);

  return modeloRepository.create({ ...dto, createdBy: userId });
}

export async function update(id: string, dto: UpdateModeloDto): Promise<IModelo> {
  ensureValidObjectId(id);

  // Verificar existencia antes de actualizar
  const existing = await modeloRepository.findById(id);
  if (!existing) {
    throw new AppError(404, 'Modelo no encontrado');
  }

  // Si se actualiza la fecha de nacimiento, revalidar edad mínima
  if (dto.birthDate) {
    ensureMinimumAge(dto.birthDate);
  }

  const updated = await modeloRepository.updateById(id, dto);
  if (!updated) {
    throw new AppError(404, 'Modelo no encontrado');
  }
  return updated;
}

export async function remove(id: string): Promise<void> {
  ensureValidObjectId(id);
  const deleted = await modeloRepository.deleteById(id);
  if (!deleted) {
    throw new AppError(404, 'Modelo no encontrado');
  }
}
