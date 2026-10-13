import { Router } from 'express';
import { login, getMe, getDemoAccounts, demoLogin } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/login', login);
router.post('/demo-login', demoLogin);
router.get('/me', authenticate, getMe);
router.get('/demo-accounts', getDemoAccounts);

export default router;
