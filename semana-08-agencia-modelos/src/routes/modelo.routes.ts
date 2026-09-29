import { Router } from 'express';
import {
  getModelos,
  getModeloById,
  createModelo,
  updateModelo,
  deleteModelo,
} from '../controllers/modelo.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/requireRole.js';

const router = Router();

// ============================================
// Políticas de acceso — Agencia de Modelos
// ============================================
// ¿Puede un visitante sin cuenta ver el catálogo?
// → SÍ: una agencia necesita mostrar su talento.
//   GET / y GET /:id son PÚBLICOS.
//
// ¿Quién puede registrar fichas?
// → Usuarios AUTENTICADOS (bookers, scouts).
//
// ¿Quién puede editar?
// → El DUEÑO de la ficha o ADMIN (verificado en el service).
//
// ¿Quién puede eliminar?
// → Solo ADMIN.
//
// IMPORTANTE: requireRole SIEMPRE después de authMiddleware.
// ============================================

// Catálogo público
router.get('/', getModelos);
router.get('/:id', getModeloById);

// Crear ficha: requiere autenticación
router.post('/', authMiddleware, createModelo);

// Actualizar: autenticado (el service verifica dueño o admin)
router.patch('/:id', authMiddleware, updateModelo);

// Eliminar: solo admin
router.delete('/:id', authMiddleware, requireRole('admin'), deleteModelo);

export default router;
