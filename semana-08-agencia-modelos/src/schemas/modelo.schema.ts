import { z } from 'zod';

// ============================================
// SCHEMAS ZOD — Recurso Modelo (Agencia de Modelos)
// ============================================
// Zod valida y sanitiza la entrada: los campos de
// texto rechazan < > para prevenir XSS almacenado.
// Los operadores de Mongo ($gt, $where...) se
// eliminan antes con express-mongo-sanitize.
// ============================================

// Previene etiquetas HTML en texto libre (XSS)
const noHtml = /^[^<>]*$/;

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

// Fecha de nacimiento: válida, en el pasado y con edad mínima de 14 años
const birthDateSchema = z
  .string()
  .regex(noHtml)
  .refine((val) => !Number.isNaN(Date.parse(val)), {
    message: 'birthDate must be a valid ISO 8601 date',
  })
  .refine((val) => new Date(val) < new Date(), {
    message: 'birthDate must be in the past',
  })
  .refine(
    (val) => {
      const birth = new Date(val);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age >= 14;
    },
    { message: 'Modelo must be at least 14 years old' }
  );

export const createModeloSchema = z.object({
  body: z.object({
    fullName: z
      .string()
      .min(2, 'fullName must be at least 2 characters')
      .max(100)
      .regex(noHtml, 'fullName must not contain HTML characters'),
    code: z
      .string()
      .regex(/^[A-Za-z]{3}-\d{4}$/, 'code must match AAA-0000 (e.g. MDL-0001)')
      .regex(noHtml),
    gender: z.enum(GENDERS),
    birthDate: birthDateSchema,
    height: z.number().min(140).max(220),
    category: z.enum(CATEGORIES),
    experienceYears: z.number().int().min(0).max(60).default(0),
    dailyRate: z.number().positive('dailyRate must be greater than 0'),
    portfolioUrl: z.string().url('portfolioUrl must be a valid URL').optional(),
    phone: z.string().min(7).max(20).regex(noHtml).optional(),
    status: z.enum(STATUSES).default('disponible'),
  }),
});

export const updateModeloSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100).regex(noHtml).optional(),
    // code no se puede modificar: identificador estable de la agencia
    gender: z.enum(GENDERS).optional(),
    birthDate: birthDateSchema.optional(),
    height: z.number().min(140).max(220).optional(),
    category: z.enum(CATEGORIES).optional(),
    experienceYears: z.number().int().min(0).max(60).optional(),
    dailyRate: z.number().positive().optional(),
    portfolioUrl: z.string().url().optional(),
    phone: z.string().min(7).max(20).regex(noHtml).optional(),
    status: z.enum(STATUSES).optional(),
    active: z.boolean().optional(),
  }),
});

export type CreateModeloDto = z.infer<typeof createModeloSchema>['body'];
export type UpdateModeloDto = z.infer<typeof updateModeloSchema>['body'];
