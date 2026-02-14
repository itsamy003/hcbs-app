import { Router } from 'express';
import { AppointmentController } from '../controllers/appointmentController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/slots', authenticateToken, AppointmentController.searchSlots);
router.post('/', authenticateToken, AppointmentController.bookAppointment);
router.get('/', authenticateToken, AppointmentController.getAppointments);

export default router;
