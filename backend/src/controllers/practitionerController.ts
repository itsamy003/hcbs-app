import { Request, Response } from 'express';
import aidboxClient from '../config/aidbox';
import { v4 as uuidv4 } from 'uuid';

export const PractitionerController = {
    async setAvailability(req: Request, res: Response) {
        try {
            const practitionerId = req.user?.fhirResourceId;
            if (!practitionerId) return res.status(400).json({ error: "User not linked to a Practitioner" });

            const { start, end, durationMinutes, status = 'free' } = req.body;
            const startTime = new Date(start);
            const endTime = new Date(end);

            // 1. Create or Find Schedule
            // Ideally check if schedule exists for this period. For simplicity, create a new Schedule for this block.
            const scheduleId = uuidv4();
            await aidboxClient.put(`/Schedule/${scheduleId}`, {
                resourceType: "Schedule",
                id: scheduleId,
                actor: [{ reference: `Practitioner/${practitionerId}` }],
                planningHorizon: { start: startTime.toISOString(), end: endTime.toISOString() },
                comment: status === 'busy' ? "PTO/Time Off" : "Availability posted by practitioner"
            });

            // 2. Generate Slots
            const slots = [];

            if (status === 'busy') {
                // For PTO, create a single busy slot for the entire range
                const slotId = uuidv4();
                slots.push({
                    resourceType: "Slot",
                    id: slotId,
                    schedule: { reference: `Schedule/${scheduleId}` },
                    status: "busy",
                    start: startTime.toISOString(),
                    end: endTime.toISOString(),
                    comment: "PTO"
                });
            } else {
                let current = new Date(startTime);
                while (current < endTime) {
                    const slotEnd = new Date(current.getTime() + durationMinutes * 60000);
                    if (slotEnd > endTime) break;

                    const slotId = uuidv4();
                    slots.push({
                        resourceType: "Slot",
                        id: slotId,
                        schedule: { reference: `Schedule/${scheduleId}` },
                        status: "free",
                        start: current.toISOString(),
                        end: slotEnd.toISOString()
                    });

                    current = slotEnd;
                }
            }

            // Batch create slots
            // Using transaction or batch is better.
            const bundle = {
                resourceType: "Bundle",
                type: "transaction",
                entry: slots.map(slot => ({
                    resource: slot,
                    request: { method: "PUT", url: `/Slot/${slot.id}` }
                }))
            };

            await aidboxClient.post('/', bundle);

            res.status(201).json({ message: "Availability/PTO set", slotsCreated: slots.length });

        } catch (error: any) {
            const detail = error.response?.data || error.message;
            console.error("Set Availability Error:", JSON.stringify(detail, null, 2));
            res.status(500).json({ error: "Failed to set availability", detail });
        }
    },

    async getPatients(req: Request, res: Response) {
        try {
            const practitionerId = req.user?.fhirResourceId;
            // Find CareTeams where this practitioner is a participant
            const response = await aidboxClient.get('/CareTeam', {
                params: {
                    participant: `Practitioner/${practitionerId}`,
                    _include: 'CareTeam:subject', // This brings in the Patient
                    status: 'active'
                }
            });

            const entries = response.data.entry || [];
            const patients = entries
                .filter((e: any) => e.resource.resourceType === 'Patient')
                .map((e: any) => e.resource);

            // Deduplicate if needed (though CareTeam usually 1 per patient)
            // Map by ID to dedupe
            const uniquePatients = Array.from(new Map(patients.map((p: any) => [p.id, p])).values());

            res.json(uniquePatients);

        } catch (error: any) {
            console.error("Get Practitioner Patients Error:", error.message);
            res.status(500).json({ error: "Failed to fetch patients" });
        }
    }
};
