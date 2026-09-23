import { Router } from 'express';
import {
  listReceivings,
  getReceivingById,
  createReceiving,
  addReceivingItem,
  startChecking,
  checkReceiving,
  storeReceiving,
  cancelReceiving,
} from '../controllers/receivingController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

// Consultas permitidas a todos os perfis autenticados
router.get('/', authenticate, listReceivings);
router.get('/:id', authenticate, getReceivingById);

// Operações de Recebimento, Conferência e Armazenagem (ADMIN, GERENTE e OPERADOR)
router.post('/', authenticate, requireRole(['ADMIN', 'GERENTE', 'OPERADOR']), createReceiving);
router.post('/:id/items', authenticate, requireRole(['ADMIN', 'GERENTE', 'OPERADOR']), addReceivingItem);
router.post('/:id/start-checking', authenticate, requireRole(['ADMIN', 'GERENTE', 'OPERADOR']), startChecking);
router.post('/:id/check', authenticate, requireRole(['ADMIN', 'GERENTE', 'OPERADOR']), checkReceiving);
router.post('/:id/store', authenticate, requireRole(['ADMIN', 'GERENTE', 'OPERADOR']), storeReceiving);

// Cancelamento de Recebimento (ADMIN e GERENTE)
router.patch('/:id/cancel', authenticate, requireRole(['ADMIN', 'GERENTE']), cancelReceiving);

export default router;
