import { Router } from 'express';
import {
  getStockReport,
  getMovementsReport,
  getReceivingsReport,
  getOrdersReport,
} from '../controllers/reportController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Relatórios disponíveis a todos os usuários autenticados (ADMIN, GERENTE, OPERADOR, CONSULTA)
router.get('/stock', authenticate, getStockReport);
router.get('/movements', authenticate, getMovementsReport);
router.get('/receivings', authenticate, getReceivingsReport);
router.get('/orders', authenticate, getOrdersReport);

export default router;
