import { Router } from 'express';
import { PractitionerController } from '../controllers/practitionerController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.post('/availability', authenticateToken, requireRole(['practitioner']), PractitionerController.setAvailability);
router.get('/patients', authenticateToken, requireRole(['practitioner']), PractitionerController.getPatients);

export default router;
