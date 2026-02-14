import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { authenticateToken } from './middleware/auth';

// Import routes (we will create these next)
import authRoutes from './routes/authRoutes';
import guardianRoutes from './routes/guardianRoutes';
import practitionerRoutes from './routes/practitionerRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import patientRoutes from './routes/patientRoutes';
import carePlanRoutes from './routes/carePlanRoutes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/guardian', guardianRoutes);
app.use('/practitioner', practitionerRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/patient', patientRoutes);
app.use('/careplans', carePlanRoutes);
// app.use('/api', authenticateToken); // Protect all API routes
// app.use('/api/patients', patientRoutes);

// Start Server
app.listen(config.port, () => {
    console.log(`Backend server running on port ${config.port}`);
    console.log(`Aidbox Base URL: ${config.aidbox.baseUrl}`);
});
