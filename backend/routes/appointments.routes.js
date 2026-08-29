import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getAvailability,
  createAppointment,
  getMyAppointments,
  updateAppointment,
  cancelAppointment,
} from '../controllers/appointments.controller.js';

const router = Router();

router.get('/availability', authenticate, getAvailability);
router.post('/', authenticate, createAppointment);
router.get('/my', authenticate, getMyAppointments);
router.put('/:id', authenticate, updateAppointment);
router.patch('/:id/cancel', authenticate, cancelAppointment);

export default router;
