import { Router } from 'express';
import {
  listStock,
  listMovements,
  registerMovement,
  registerEntry,
  registerExit,
} from '../controllers/stockController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

// Consultas permitidas a todos os perfis autenticados
router.get('/', authenticate, listStock);
router.get('/movements', authenticate, listMovements);

// Registro de movimentações protegido por RBAC (ADMIN, GERENTE e OPERADOR)
router.post('/movements', authenticate, requireRole(['ADMIN', 'GERENTE', 'OPERADOR']), registerMovement);
router.post('/entry', authenticate, requireRole(['ADMIN', 'GERENTE', 'OPERADOR']), registerEntry);
router.post('/exit', authenticate, requireRole(['ADMIN', 'GERENTE', 'OPERADOR']), registerExit);

export default router;
