import { Router } from 'express';
import { PatientController } from '../controllers/patientController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/care-team', authenticateToken, PatientController.getCareTeam);

export default router;
