import { Request, Response } from 'express';
import aidboxClient from '../config/aidbox';
import { v4 as uuidv4 } from 'uuid';

export const CarePlanController = {
    async create(req: Request, res: Response) {
        try {
            const user = req.user!;
            // Only practitioners can create care plans (usually)
            if (user.role !== 'practitioner') {
                return res.status(403).json({ error: "Only practitioners can create Care Plans" });
            }

            const { patientId, title, description, start, end, status } = req.body;
            if (!patientId || !title) {
                return res.status(400).json({ error: "Patient ID and Title are required" });
            }

            const carePlanId = uuidv4();
            const carePlan = {
                resourceType: "CarePlan",
                id: carePlanId,
                status: status || "active",
                intent: "plan",
                title: title,
                description: description,
                subject: { reference: `Patient/${patientId}` },
                period: {
                    start: start || new Date().toISOString(),
                    end: end
                },
                author: { reference: `Practitioner/${user.fhirResourceId}` },
                created: new Date().toISOString(),
                // We can add activities/goals later or here if passed in body
                activity: req.body.activities?.map((act: any) => ({
                    detail: {
                        status: 'not-started', // Default
                        description: act.description,
                        scheduledString: act.schedule // Simplification
                    }
                }))
            };

            await aidboxClient.put(`/CarePlan/${carePlanId}`, carePlan);

            res.status(201).json(carePlan);

        } catch (error: any) {
            console.error("Create CarePlan Error:", error.message);
            res.status(500).json({ error: "Failed to create CarePlan" });
        }
    },

    async getByPatient(req: Request, res: Response) {
        try {
            const { patientId } = req.params;
            // TODO: Add Authorization check (is this user allowed to see this patient's plan?)

            const response = await aidboxClient.get('/CarePlan', {
                params: {
                    subject: `Patient/${patientId}`,
                    _sort: '-date'
                }
            });
            res.json(response.data.entry?.map((e: any) => e.resource) || []);

        } catch (error: any) {
            console.error("Get CarePlan by Patient Error:", error.message);
            res.status(500).json({ error: "Failed to fetch CarePlans" });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Fetch existing to ensure it exists and maybe check permissions
            const existingRes = await aidboxClient.get(`/CarePlan/${id}`);
            const existing = existingRes.data;

            const updated = {
                ...existing,
                ...updates,
                // Prevent changing immutable fields if needed
            };

            await aidboxClient.put(`/CarePlan/${id}`, updated);
            res.json(updated);

        } catch (error: any) {
            console.error("Update CarePlan Error:", error.message);
            res.status(500).json({ error: "Failed to update CarePlan" });
        }
    }
};
