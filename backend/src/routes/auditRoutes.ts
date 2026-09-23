import { Router } from 'express';
import { listAuditLogs } from '../controllers/auditController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

// Apenas perfil ADMIN possui permissão para consultar logs de auditoria
router.get('/', authenticate, requireRole(['ADMIN']), listAuditLogs);

export default router;
