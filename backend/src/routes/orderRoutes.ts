import { Router } from 'express';
import {
  listOrders,
  getOrderById,
  createOrder,
  addOrderItem,
  startPicking,
  pickOrder,
  shipOrder,
  cancelOrder,
} from '../controllers/orderController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

// Consultas permitidas a todos os perfis autenticados (ADMIN, GERENTE, OPERADOR, CONSULTA)
router.get('/', authenticate, listOrders);
router.get('/:id', authenticate, getOrderById);

// Operações de Pedido, Separação e Expedição (ADMIN, GERENTE e OPERADOR)
router.post('/', authenticate, requireRole(['ADMIN', 'GERENTE', 'OPERADOR']), createOrder);
router.post('/:id/items', authenticate, requireRole(['ADMIN', 'GERENTE', 'OPERADOR']), addOrderItem);
router.post('/:id/start-picking', authenticate, requireRole(['ADMIN', 'GERENTE', 'OPERADOR']), startPicking);
router.post('/:id/pick', authenticate, requireRole(['ADMIN', 'GERENTE', 'OPERADOR']), pickOrder);
router.post('/:id/ship', authenticate, requireRole(['ADMIN', 'GERENTE', 'OPERADOR']), shipOrder);

// Cancelamento de Pedidos (Restrito a ADMIN e GERENTE; OPERADOR e CONSULTA recebem 403 Forbidden)
router.patch('/:id/cancel', authenticate, requireRole(['ADMIN', 'GERENTE']), cancelOrder);

export default router;
