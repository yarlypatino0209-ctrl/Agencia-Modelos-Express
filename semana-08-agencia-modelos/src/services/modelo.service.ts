import { Modelo, IModelo } from '../models/modelo.model.js';
import type { CreateModeloDto, UpdateModeloDto } from '../schemas/modelo.schema.js';
import { AppError } from '../errors/AppError.js';

// ============================================
// SERVICIO — Modelo (Agencia de Modelos)
// ============================================

export async function findAll(filters?: {
  category?: string;
  status?: string;
}): Promise<IModelo[]> {
  // Solo fichas activas, más recientes primero.
  // Filtros típicos de la agencia: categoría + disponibilidad.
  // Se omiten los filtros undefined: Mongo los interpretaría
  // como "campo ausente" y excluiría documentos válidos.
  const query: Record<string, unknown> = { active: true };
  if (filters?.category) query.category = filters.category;
  if (filters?.status) query.status = filters.status;
  return Modelo.find(query).sort({ createdAt: -1 });
}

export async function findById(id: string): Promise<IModelo | null> {
  return Modelo.findById(id);
}

export async function findByCode(code: string): Promise<IModelo | null> {
  return Modelo.findOne({ code: code.toUpperCase() });
}

export async function create(data: CreateModeloDto, userId: string): Promise<IModelo> {
  // Regla de negocio: el código de agencia debe ser único
  const existing = await findByCode(data.code);
  if (existing) {
    throw new AppError(409, `Modelo code ${data.code.toUpperCase()} already exists`);
  }

  // createdBy guarda quién creó el recurso (para autorización posterior)
  return Modelo.create({ ...data, createdBy: userId });
}

export async function update(
  id: string,
  data: UpdateModeloDto,
  requesterId: string,
  requesterRole: string
): Promise<IModelo | null> {
  const modelo = await Modelo.findById(id);
  if (!modelo) return null;

  // Autorización a nivel de recurso:
  // un usuario solo puede editar SU ficha; admin puede editar cualquiera.
  if (requesterRole !== 'admin' && modelo.createdBy !== requesterId) {
    throw new Error('FORBIDDEN'); // capturar en controller → AppError(403)
  }

  return Modelo.findByIdAndUpdate(id, data, {
    returnDocument: 'after',
    runValidators: true,
  });
}

export async function remove(id: string): Promise<IModelo | null> {
  // Eliminación solo admin — enforced en la ruta con requireRole('admin')
  return Modelo.findByIdAndDelete(id);
}
