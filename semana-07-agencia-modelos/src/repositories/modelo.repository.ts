import { ModeloModel, IModelo } from '../models/modelo.model';
import { CreateModeloDto, UpdateModeloDto } from '../schemas/modelo.schema';

// ============================================
// REPOSITORIO — Modelo (Agencia de Modelos)
// Operaciones de base de datos con Mongoose.
// ============================================

export interface ModeloFilters {
  category?: string;
  status?: string;
  active?: boolean;
}

export async function findAll(filters: ModeloFilters = {}): Promise<IModelo[]> {
  // Construir la query omitiendo filtros undefined:
  // Mongo interpretaría { status: undefined } como "campo ausente",
  // lo que excluiría documentos válidos.
  const query: Record<string, unknown> = {};
  if (filters.category) query.category = filters.category;
  if (filters.status) query.status = filters.status;
  if (typeof filters.active === 'boolean') query.active = filters.active;
  return ModeloModel.find(query).sort({ createdAt: -1 }).lean();
}

export async function findById(id: string): Promise<IModelo | null> {
  return ModeloModel.findById(id);
}

export async function findByCode(code: string): Promise<IModelo | null> {
  return ModeloModel.findOne({ code: code.toUpperCase() });
}

export async function create(
  data: CreateModeloDto & { createdBy: string }
): Promise<IModelo> {
  return ModeloModel.create(data);
}

export async function updateById(
  id: string,
  data: UpdateModeloDto
): Promise<IModelo | null> {
  return ModeloModel.findByIdAndUpdate(id, data, {
    returnDocument: 'after', // retorna el documento actualizado
    runValidators: true, // ejecuta validaciones del schema
  });
}

export async function deleteById(id: string): Promise<boolean> {
  const result = await ModeloModel.findByIdAndDelete(id);
  return result !== null;
}
