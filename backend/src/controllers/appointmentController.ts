import { Request, Response } from 'express';
import aidboxClient from '../config/aidbox';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { config } from '../config/env';

export const AppointmentController = {
    async searchSlots(req: Request, res: Response) {
        try {
            const { start, end } = req.query;
            // FHIR Search for free slots
            const response = await aidboxClient.get('/Slot', {
                params: {
                    status: 'free',
                    start: `ge${start}`,
                    end: `le${end}`,
                    _sort: 'start'
                }
            });
            res.json(response.data.entry?.map((e: any) => e.resource) || []);
        } catch (error: any) {
            console.error("Search Slots Error:", error.message);
            res.status(500).json({ error: "Failed to search slots" });
        }
    },

    async bookAppointment(req: Request, res: Response) {
        try {
            const { slotId, patientId, reason } = req.body;
            const user = req.user!;

            let targetPatientId = patientId;
            if (user.role === 'patient') {
                targetPatientId = user.fhirResourceId;
            } else if (user.role === 'guardian') {
                if (!targetPatientId) return res.status(400).json({ error: "Patient ID required" });
            }

            // Trigger Restate Workflow
            const restateUrl = `http://${config.restate.host}:${config.restate.port}/appointment/bookAppointment`;

            const response = await axios.post(restateUrl, {
                slotId,
                patientId: targetPatientId,
                reason
            });

            res.status(202).json({
                message: "Booking request started",
                workflowId: response.data.id,
                status: response.data.status
            });

        } catch (error: any) {
            console.error("Book Appointment Error:", error.message);
            res.status(500).json({ error: "Failed to book appointment" });
        }
    },

    async getAppointments(req: Request, res: Response) {
        try {
            const user = req.user!;
            let params: any = { _sort: '-date' };

            if (user.role === 'practitioner') {
                params['actor'] = `Practitioner/${user.fhirResourceId}`;
            } else if (user.role === 'patient') {
                params['actor'] = `Patient/${user.fhirResourceId}`;
            } else if (user.role === 'guardian') {
                // Find *all* patients for this guardian?
                // Or filter by specific patient if query param provided.
                // For now, simpler: user must provide patientId query param or we find all.
                // Finding all requires knowing all patient IDs.
                // Let's just return empty for guardian unless they filter by patient.
                if (req.query.patientId) {
                    params['actor'] = `Patient/${req.query.patientId}`;
                } else {
                    // TODO: Lookup all patients for guardian
                }
            }

            const response = await aidboxClient.get('/Appointment', { params });
            res.json(response.data.entry?.map((e: any) => e.resource) || []);

        } catch (error: any) {
            console.error("Get Appointments Error:", error.message);
            res.status(500).json({ error: "Failed to fetch appointments" });
        }
    }
};
