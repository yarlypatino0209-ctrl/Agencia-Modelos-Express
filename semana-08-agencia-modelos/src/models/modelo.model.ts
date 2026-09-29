import { Schema, model, Document } from 'mongoose';

// ============================================
// MODELO — Recurso principal del dominio
// Agencia de Modelos → Portafolio de modelos
// ============================================
// Cada documento representa la ficha profesional
// de un/a modelo representado por la agencia.
//
// El campo createdBy guarda el ID del usuario que
// creó la ficha: el dueño puede editar SU ficha,
// pero solo admin puede eliminarla.
// ============================================

export type ModeloGender = 'femenino' | 'masculino' | 'no-binario';

export type ModeloCategory =
  | 'pasarela'
  | 'publicidad'
  | 'editorial'
  | 'fitness'
  | 'plus-size'
  | 'infantil'
  | 'partes';

export type ModeloStatus = 'disponible' | 'en-contrato' | 'inactivo';

export interface IModelo extends Document {
  fullName: string;
  code: string; // Código único de la agencia. Ej: "MDL-0001"
  gender: ModeloGender;
  birthDate: Date;
  height: number; // Estatura en centímetros
  category: ModeloCategory;
  experienceYears: number;
  dailyRate: number; // Tarifa por día de trabajo
  portfolioUrl?: string;
  phone?: string;
  status: ModeloStatus;
  active: boolean;
  createdBy: string; // user ID — NO remover (se usa para autorización)
  createdAt: Date;
  updatedAt: Date;
}

const modeloSchema = new Schema<IModelo>(
  {
    fullName: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{3}-\d{4}$/, 'El código debe tener el formato AAA-0000'],
    },
    gender: {
      type: String,
      enum: ['femenino', 'masculino', 'no-binario'],
      required: true,
    },
    birthDate: { type: Date, required: true },
    height: { type: Number, required: true, min: 140, max: 220 },
    category: {
      type: String,
      enum: [
        'pasarela',
        'publicidad',
        'editorial',
        'fitness',
        'plus-size',
        'infantil',
        'partes',
      ],
      required: true,
    },
    experienceYears: { type: Number, default: 0, min: 0, max: 60 },
    dailyRate: { type: Number, required: true, min: 0 },
    portfolioUrl: { type: String, trim: true },
    phone: { type: String, trim: true },
    status: {
      type: String,
      enum: ['disponible', 'en-contrato', 'inactivo'],
      default: 'disponible',
    },
    active: { type: Boolean, default: true },
    createdBy: { type: String, required: true }, // user ID
  },
  { timestamps: true }
);

// Índice para búsquedas por categoría + estado (filtros típicos de la agencia)
modeloSchema.index({ category: 1, status: 1 });

export const Modelo = model<IModelo>('Modelo', modeloSchema);
