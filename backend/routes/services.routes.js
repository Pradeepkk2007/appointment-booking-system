import { Router } from 'express';
import { listServices } from '../controllers/services.controller.js';

const router = Router();

// Public route - anyone (logged in or not) can view active services
router.get('/', listServices);

export default router;
