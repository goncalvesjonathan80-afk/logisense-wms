import { Router } from 'express';
import { listUsers } from '../controllers/userController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

// Apenas ADMIN e GERENTE podem consultar usuários do sistema
router.get('/', authenticate, requireRole(['ADMIN', 'GERENTE']), listUsers);

export default router;
