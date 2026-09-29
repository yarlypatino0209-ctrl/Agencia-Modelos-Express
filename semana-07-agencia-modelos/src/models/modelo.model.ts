import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// MODELO — Recurso principal del dominio
// Agencia de Modelos → Portafolio de modelos
// ============================================
// Cada documento representa la ficha profesional
// de un/a modelo representado por la agencia.
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
  createdBy: mongoose.Types.ObjectId; // Usuario que registró la ficha
  createdAt: Date;
  updatedAt: Date;
}

const modeloSchema = new Schema<IModelo>(
  {
    fullName: {
      type: String,
      required: [true, 'El nombre completo es requerido'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [100, 'El nombre no puede superar 100 caracteres'],
    },
    code: {
      type: String,
      required: [true, 'El código de modelo es requerido'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{3}-\d{4}$/, 'El código debe tener el formato AAA-0000 (ej: MDL-0001)'],
    },
    gender: {
      type: String,
      enum: {
        values: ['femenino', 'masculino', 'no-binario'],
        message: 'Género inválido',
      },
      required: [true, 'El género es requerido'],
    },
    birthDate: {
      type: Date,
      required: [true, 'La fecha de nacimiento es requerida'],
    },
    height: {
      type: Number,
      required: [true, 'La estatura es requerida'],
      min: [140, 'La estatura mínima es 140 cm'],
      max: [220, 'La estatura máxima es 220 cm'],
    },
    category: {
      type: String,
      enum: {
        values: [
          'pasarela',
          'publicidad',
          'editorial',
          'fitness',
          'plus-size',
          'infantil',
          'partes',
        ],
        message: 'Categoría inválida',
      },
      required: [true, 'La categoría es requerida'],
    },
    experienceYears: {
      type: Number,
      default: 0,
      min: [0, 'Los años de experiencia no pueden ser negativos'],
      max: [60, 'Valor de experiencia no válido'],
    },
    dailyRate: {
      type: Number,
      required: [true, 'La tarifa por día es requerida'],
      min: [0, 'La tarifa no puede ser negativa'],
    },
    portfolioUrl: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['disponible', 'en-contrato', 'inactivo'],
        message: 'Estado inválido',
      },
      default: 'disponible',
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario creador es requerido'],
    },
  },
  { timestamps: true }
);

// Índice para búsquedas por categoría + estado (filtros típicos de la agencia)
modeloSchema.index({ category: 1, status: 1 });

export const ModeloModel = mongoose.model<IModelo>('Modelo', modeloSchema);
