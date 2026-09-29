import { z } from 'zod';

// ============================================
// SCHEMAS ZOD — Recurso Modelo (Agencia de Modelos)
// ============================================

const GENDERS = ['femenino', 'masculino', 'no-binario'] as const;

const CATEGORIES = [
  'pasarela',
  'publicidad',
  'editorial',
  'fitness',
  'plus-size',
  'infantil',
  'partes',
] as const;

const STATUSES = ['disponible', 'en-contrato', 'inactivo'] as const;

// Fecha de nacimiento: debe ser una fecha válida en el pasado
const birthDateSchema = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), {
    message: 'La fecha de nacimiento debe ser una fecha válida (ISO 8601)',
  })
  .refine((val) => new Date(val) < new Date(), {
    message: 'La fecha de nacimiento debe estar en el pasado',
  });

export const createModeloSchema = z.object({
  fullName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede superar 100 caracteres')
    .trim(),
  code: z
    .string()
    .regex(/^[A-Za-z]{3}-\d{4}$/, 'El código debe tener el formato AAA-0000 (ej: MDL-0001)')
    .trim(),
  gender: z.enum(GENDERS, { message: 'Género inválido' }),
  birthDate: birthDateSchema,
  height: z
    .number({ message: 'La estatura debe ser un número' })
    .min(140, 'La estatura mínima es 140 cm')
    .max(220, 'La estatura máxima es 220 cm'),
  category: z.enum(CATEGORIES, { message: 'Categoría inválida' }),
  experienceYears: z
    .number({ message: 'Los años de experiencia deben ser un número' })
    .int('Debe ser un número entero')
    .min(0, 'No puede ser negativo')
    .max(60, 'Valor no válido')
    .default(0),
  dailyRate: z
    .number({ message: 'La tarifa debe ser un número' })
    .positive('La tarifa debe ser mayor a 0'),
  portfolioUrl: z.string().url('Debe ser una URL válida').optional(),
  phone: z.string().min(7, 'Teléfono inválido').max(20, 'Teléfono inválido').optional(),
  status: z.enum(STATUSES, { message: 'Estado inválido' }).default('disponible'),
  active: z.boolean().default(true),
});

// Actualización parcial: todos los campos opcionales.
// El código no se permite modificar (identificador estable de la agencia).
export const updateModeloSchema = createModeloSchema
  .omit({ code: true })
  .partial();

export type CreateModeloDto = z.infer<typeof createModeloSchema>;
export type UpdateModeloDto = z.infer<typeof updateModeloSchema>;
