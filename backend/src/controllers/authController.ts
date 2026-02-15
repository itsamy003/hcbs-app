import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { z } from 'zod';

const signupSchema = z.object({
    type: z.enum(['practitioner', 'patient', 'guardian']),
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string(),
    lastName: z.string(),
    dob: z.string().optional(), // Required for patient
    specialty: z.string().optional(), // For practitioner
});

export const AuthController = {
    async signup(req: Request, res: Response) {
        try {
            const data = signupSchema.parse(req.body);

            let result;
            switch (data.type) {
                case 'practitioner':
                    result = await AuthService.signupPractitioner(data);
                    break;
                case 'patient':
                    if (!data.dob) return res.status(400).json({ error: 'DOB required for patient' });
                    result = await AuthService.signupPatient({ ...data, dob: data.dob });
                    break;
                case 'guardian':
                    result = await AuthService.signupGuardian(data);
                    break;
            }

            res.status(201).json(result);
        } catch (error: any) {
            console.error('Signup Error:', error);
            res.status(400).json({ error: error.message || 'Invalid request' });
        }
    },

    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password required' });
            }

            const result = await AuthService.login(email, password);
            res.json(result);
        } catch (error: any) {
            console.error('Login Error:', error);
            res.status(401).json({ error: error.message || 'Authentication failed' });
        }
    },
};
