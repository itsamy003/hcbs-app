import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}

export interface UserPayload {
    sub: string;
    role: 'practitioner' | 'patient' | 'guardian' | 'admin';
    fhirResourceId: string;
    email?: string;
    name?: string;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, config.jwtSecret, (err: any, user: any) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user as UserPayload;
        next();
    });
};

export const requireRole = (roles: UserPayload['role'][]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};
