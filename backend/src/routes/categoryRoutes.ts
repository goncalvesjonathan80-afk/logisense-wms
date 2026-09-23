import { Router } from 'express';
import { listCategories } from '../controllers/categoryController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/', authenticate, listCategories);

export default router;
