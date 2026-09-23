import { Router } from 'express';
import authRoutes from './authRoutes';
import dashboardRoutes from './dashboardRoutes';
import productRoutes from './productRoutes';
import stockRoutes from './stockRoutes';
import orderRoutes from './orderRoutes';
import locationRoutes from './locationRoutes';
import iotRoutes from './iotRoutes';
import auditRoutes from './auditRoutes';
import userRoutes from './userRoutes';
import categoryRoutes from './categoryRoutes';
import receivingRoutes from './receivingRoutes';
import reportRoutes from './reportRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/products', productRoutes);
router.use('/stock', stockRoutes);
router.use('/receivings', receivingRoutes);
router.use('/orders', orderRoutes);
router.use('/locations', locationRoutes);
router.use('/iot', iotRoutes);
router.use('/reports', reportRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/users', userRoutes);

export default router;
