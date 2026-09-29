import { Router } from 'express';
import * as modeloController from '../controllers/modelo.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

// ============================================
// RUTAS — Modelo (Agencia de Modelos)
// Todas las rutas requieren autenticación (JWT en cookie HttpOnly).
// Montadas en app.ts como /api/v1/modelos
// ============================================

const router = Router();

// Todas las rutas de este router requieren autenticación
router.use(authMiddleware);

// GET /api/v1/modelos — listar fichas (con filtros opcionales)
router.get('/', modeloController.getAll);

// GET /api/v1/modelos/:id — obtener una ficha por ID
router.get('/:id', modeloController.getById);

// POST /api/v1/modelos — registrar una nueva ficha
router.post('/', modeloController.create);

// PATCH /api/v1/modelos/:id — actualización parcial
router.patch('/:id', modeloController.update);

// DELETE /api/v1/modelos/:id — eliminar una ficha
router.delete('/:id', modeloController.remove);

export default router;
