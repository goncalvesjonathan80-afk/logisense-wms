import { Router } from 'express';
import {
  listIoTTelemetry,
  getLatestTelemetry,
  simulateIoTTelemetry,
  listAlerts,
  resolveAlert,
} from '../controllers/iotController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

// Consultas de Telemetria e Alertas (Todos os perfis autenticados, inclusive CONSULTA)
router.get('/telemetry', authenticate, listIoTTelemetry);
router.get('/telemetry/latest', authenticate, getLatestTelemetry);
router.get('/readings', authenticate, listIoTTelemetry); // Retrocompatibilidade Fase 1
router.get('/alerts', authenticate, listAlerts);

// Disparo de Telemetria Simulada (ADMIN, GERENTE e OPERADOR)
router.post(
  '/telemetry/simulate',
  authenticate,
  requireRole(['ADMIN', 'GERENTE', 'OPERADOR']),
  simulateIoTTelemetry
);
router.post(
  '/simulate',
  authenticate,
  requireRole(['ADMIN', 'GERENTE', 'OPERADOR']),
  simulateIoTTelemetry
);

// Resolução de Alerta (ADMIN, GERENTE e OPERADOR; CONSULTA bloqueado com HTTP 403)
router.patch(
  '/alerts/:id/resolve',
  authenticate,
  requireRole(['ADMIN', 'GERENTE', 'OPERADOR']),
  resolveAlert
);

export default router;
