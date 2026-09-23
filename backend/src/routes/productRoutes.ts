import { Router } from 'express';
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
} from '../controllers/productController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

// Consultas permitidas a todos os perfis autenticados
router.get('/', authenticate, listProducts);
router.get('/:id', authenticate, getProductById);

// Mutações protegidas por RBAC (Apenas ADMIN e GERENTE)
router.post('/', authenticate, requireRole(['ADMIN', 'GERENTE']), createProduct);
router.put('/:id', authenticate, requireRole(['ADMIN', 'GERENTE']), updateProduct);
router.patch('/:id/status', authenticate, requireRole(['ADMIN', 'GERENTE']), toggleProductStatus);

export default router;
