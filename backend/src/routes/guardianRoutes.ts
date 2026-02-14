import { Router } from 'express';
import { GuardianController } from '../controllers/guardianController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Search & link patients
router.get('/search-patients', authenticateToken, requireRole(['guardian']), GuardianController.searchPatients);
router.post('/link-patient', authenticateToken, requireRole(['guardian']), GuardianController.linkPatient);
router.get('/patients', authenticateToken, requireRole(['guardian']), GuardianController.getPatients);

// Practitioner management
router.get('/search-practitioners', authenticateToken, requireRole(['guardian']), GuardianController.searchPractitioners);
router.post('/assign-practitioner', authenticateToken, requireRole(['guardian']), GuardianController.assignPractitioner);

// Appointment booking
router.get('/slots', authenticateToken, requireRole(['guardian']), GuardianController.getAvailableSlots);
router.post('/book-appointment', authenticateToken, requireRole(['guardian']), GuardianController.bookAppointment);

export default router;
