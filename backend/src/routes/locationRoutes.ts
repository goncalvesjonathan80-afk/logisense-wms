import { Router } from 'express';
import { listLocations } from '../controllers/locationController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/', authenticate, listLocations);

export default router;
