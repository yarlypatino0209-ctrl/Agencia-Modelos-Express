import { Router } from 'express';
import { getDashboard } from '../controllers/user.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/dashboard', getDashboard);

export default router;
