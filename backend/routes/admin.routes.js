import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  listAllServices,
  createService,
  updateService,
  deleteService,
} from '../controllers/services.controller.js';
import {
  getAllAppointments,
  updateAppointmentStatus,
  getDashboardStats,
} from '../controllers/admin.controller.js';

const router = Router();

// All admin routes require a valid token AND admin role
router.use(authenticate, requireAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Services management
router.get('/services', listAllServices);
router.post('/services', createService);
router.put('/services/:id', updateService);
router.delete('/services/:id', deleteService);

// Appointments management
router.get('/appointments', getAllAppointments);
router.patch('/appointments/:id/status', updateAppointmentStatus);

export default router;
