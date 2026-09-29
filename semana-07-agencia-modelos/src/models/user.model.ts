import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// MODELO DE USUARIO
// ============================================
// El rol por defecto es 'user'. Si tu dominio requiere
// roles adicionales (ej: 'admin', 'librarian', 'pharmacist'),
// agrégalos al enum de la propiedad role.
// ============================================

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      select: false, // nunca se devuelve en queries por defecto
    },
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    refreshToken: {
      type: String,
      select: false, // nunca se devuelve por defecto
    },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>('User', userSchema);
