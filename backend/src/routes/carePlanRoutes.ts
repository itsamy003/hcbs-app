import { Router } from 'express';
import { CarePlanController } from '../controllers/carePlanController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

router.post('/', requireRole(['practitioner']), CarePlanController.create);
router.get('/patient/:patientId', CarePlanController.getByPatient); // Guardian/Patient/Practitioner can view
router.put('/:id', requireRole(['practitioner']), CarePlanController.update);

export default router;
