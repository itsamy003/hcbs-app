import { Request, Response } from 'express';
import axios from 'axios';
import aidboxClient from '../config/aidbox';
import { config } from '../config/env';
import { v4 as uuidv4 } from 'uuid';

export const GuardianController = {
    // Search existing patients by name
    async searchPatients(req: Request, res: Response) {
        try {
            const { name } = req.query;
            if (!name) return res.status(400).json({ error: "Name query parameter required" });

            const response = await aidboxClient.get('/Patient', {
                params: {
                    name: name,
                    _count: 20
                }
            });

            const patients = (response.data.entry || []).map((e: { resource: Record<string, unknown> }) => e.resource);
            res.json(patients);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            console.error("Search Patients Error:", msg);
            res.status(500).json({ error: "Failed to search patients" });
        }
    },

    // Link an existing patient as a dependent
    async linkPatient(req: Request, res: Response) {
        try {
            const guardianPersonId = req.user?.fhirResourceId;
            if (!guardianPersonId) return res.status(400).json({ error: "User not linked to a Person resource" });

            const { patientId } = req.body;
            if (!patientId) return res.status(400).json({ error: "patientId is required" });

            // Verify patient exists
            const patientRes = await aidboxClient.get(`/Patient/${patientId}`);
            const patient = patientRes.data;

            // Check if already linked
            const existingRP = await aidboxClient.get('/RelatedPerson', {
                params: {
                    identifier: `https://hcbs-platform.com/guardian-person-id|${guardianPersonId}`,
                    patient: `Patient/${patientId}`
                }
            });
            if ((existingRP.data.entry || []).length > 0) {
                return res.status(409).json({ error: "Patient is already linked as a dependent" });
            }

            // Create RelatedPerson
            const rpId = uuidv4();
            await aidboxClient.put(`/RelatedPerson/${rpId}`, {
                resourceType: "RelatedPerson",
                id: rpId,
                patient: { reference: `Patient/${patientId}` },
                relationship: [{
                    coding: [{
                        system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
                        code: "GUARD",
                        display: "Guardian"
                    }]
                }],
                identifier: [{ system: "https://hcbs-platform.com/guardian-person-id", value: guardianPersonId }],
                name: patient.name
            });

            // Add guardian to CareTeam (find existing or create)
            const careTeamRes = await aidboxClient.get('/CareTeam', {
                params: { subject: `Patient/${patientId}`, status: 'active' }
            });
            const careTeams = (careTeamRes.data.entry || []).map((e: { resource: Record<string, unknown> }) => e.resource);

            if (careTeams.length > 0) {
                // Add guardian to existing CareTeam
                const ct = careTeams[0] as Record<string, unknown>;
                const participants = (ct.participant as Array<Record<string, unknown>>) || [];
                participants.push({
                    member: { reference: `RelatedPerson/${rpId}`, display: `Guardian` },
                    role: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", code: "GUARD", display: "Guardian" }] }]
                });
                await aidboxClient.put(`/CareTeam/${ct.id}`, { ...ct, participant: participants });
            } else {
                // Create new CareTeam
                const ctId = uuidv4();
                const patientName = patient.name?.[0]?.given?.[0] || 'Patient';
                await aidboxClient.put(`/CareTeam/${ctId}`, {
                    resourceType: "CareTeam",
                    id: ctId,
                    status: "active",
                    subject: { reference: `Patient/${patientId}` },
                    name: `${patientName}'s Care Team`,
                    participant: [{
                        member: { reference: `RelatedPerson/${rpId}`, display: `Guardian` },
                        role: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", code: "GUARD", display: "Guardian" }] }]
                    }]
                });
            }

            res.status(201).json({ message: "Patient linked successfully", relatedPersonId: rpId });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            console.error("Link Patient Error:", msg);
            res.status(500).json({ error: "Failed to link patient" });
        }
    },

    // Search available practitioners
    async searchPractitioners(req: Request, res: Response) {
        try {
            const { name } = req.query;
            const params: Record<string, string> = { _count: '20' };
            if (name) params.name = name as string;

            const response = await aidboxClient.get('/Practitioner', { params });
            const practitioners = (response.data.entry || []).map((e: { resource: any }) => {
                const p = e.resource;
                const name = p.name?.[0]
                    ? `${p.name[0].given?.join(' ') || ''} ${p.name[0].family || ''}`.trim()
                    : 'Unknown Practitioner';
                return {
                    id: p.id,
                    name,
                    role: 'Practitioner' // Default role as we're just searching resources
                };
            });
            res.json(practitioners);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            console.error("Search Practitioners Error:", msg);
            res.status(500).json({ error: "Failed to search practitioners" });
        }
    },

    // Assign a practitioner to a patient's CareTeam
    async assignPractitioner(req: Request, res: Response) {
        try {
            const guardianPersonId = req.user?.fhirResourceId;
            if (!guardianPersonId) return res.status(400).json({ error: "User not linked" });

            const { patientId, practitionerId } = req.body;
            if (!patientId || !practitionerId) return res.status(400).json({ error: "patientId and practitionerId required" });

            // Verify guardian is linked to this patient
            const rpCheck = await aidboxClient.get('/RelatedPerson', {
                params: {
                    identifier: `https://hcbs-platform.com/guardian-person-id|${guardianPersonId}`,
                    patient: `Patient/${patientId}`
                }
            });
            if ((rpCheck.data.entry || []).length === 0) {
                return res.status(403).json({ error: "You are not a guardian for this patient" });
            }

            // Get practitioner details for display name
            const practRes = await aidboxClient.get(`/Practitioner/${practitionerId}`);
            const practitioner = practRes.data;
            const practName = practitioner.name?.[0]
                ? `${practitioner.name[0].given?.join(' ') || ''} ${practitioner.name[0].family || ''}`.trim()
                : 'Practitioner';

            // Find or create CareTeam
            const careTeamRes = await aidboxClient.get('/CareTeam', {
                params: { subject: `Patient/${patientId}`, status: 'active' }
            });
            const careTeams = (careTeamRes.data.entry || []).map((e: { resource: Record<string, unknown> }) => e.resource);

            if (careTeams.length > 0) {
                const ct = careTeams[0] as Record<string, unknown>;
                const participants = (ct.participant as Array<Record<string, unknown>>) || [];

                // Check if practitioner already in team
                const alreadyIn = participants.some((p: Record<string, unknown>) => {
                    const member = p.member as Record<string, unknown> | undefined;
                    return member?.reference === `Practitioner/${practitionerId}`;
                });
                if (alreadyIn) return res.status(409).json({ error: "Practitioner already in care team" });

                participants.push({
                    member: { reference: `Practitioner/${practitionerId}`, display: practName },
                    role: [{ coding: [{ system: "http://snomed.info/sct", code: "158965000", display: "Doctor" }] }]
                });
                await aidboxClient.put(`/CareTeam/${ct.id}`, { ...ct, participant: participants });
            } else {
                const ctId = uuidv4();
                await aidboxClient.put(`/CareTeam/${ctId}`, {
                    resourceType: "CareTeam",
                    id: ctId,
                    status: "active",
                    subject: { reference: `Patient/${patientId}` },
                    name: `Care Team`,
                    participant: [{
                        member: { reference: `Practitioner/${practitionerId}`, display: practName },
                        role: [{ coding: [{ system: "http://snomed.info/sct", code: "158965000", display: "Doctor" }] }]
                    }]
                });
            }

            res.json({ message: "Practitioner assigned successfully" });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            console.error("Assign Practitioner Error:", msg);
            res.status(500).json({ error: "Failed to assign practitioner" });
        }
    },

    // Get free slots for a practitioner
    async getAvailableSlots(req: Request, res: Response) {
        try {
            const { practitionerId } = req.query;
            console.log(`[Slots] Fetching slots for practitioner: ${practitionerId}`);
            if (!practitionerId) return res.status(400).json({ error: "practitionerId required" });

            // Find schedules for this practitioner
            const scheduleRes = await aidboxClient.get('/Schedule', {
                params: { actor: `Practitioner/${practitionerId}` }
            });
            console.log(`[Slots] Schedule response status: ${scheduleRes.status}, count: ${scheduleRes.data.entry?.length}`);

            const schedules = (scheduleRes.data.entry || []).map((e: { resource: Record<string, unknown> }) => e.resource);
            if (schedules.length === 0) {
                console.log("[Slots] No schedules found");
                return res.json([]);
            }

            // Find free slots for all schedules
            const scheduleRefs = schedules.map((s: Record<string, unknown>) => `Schedule/${s.id}`);
            console.log(`[Slots] Searching slots for schedules: ${scheduleRefs.join(',')}`);
            const slotRes = await aidboxClient.get('/Slot', {
                params: {
                    schedule: scheduleRefs.join(','),
                    status: 'free',
                    start: `ge${new Date().toISOString()}`,
                    _sort: 'start',
                    _count: '50'
                }
            });
            console.log(`[Slots] Found ${slotRes.data.entry?.length || 0} slots`);
            const slots = (slotRes.data.entry || []).map((e: { resource: Record<string, unknown> }) => e.resource);
            res.json(slots);


        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            console.error("Get Slots Error:", msg);
            res.status(500).json({ error: "Failed to fetch slots" });
        }
    },

    // Book an appointment for a dependent (Direct Implementation)
    async bookAppointment(req: Request, res: Response) {
        try {
            const guardianPersonId = req.user?.fhirResourceId;
            if (!guardianPersonId) return res.status(400).json({ error: "User not linked" });

            const { slotId, patientId, reason } = req.body;
            if (!slotId || !patientId) return res.status(400).json({ error: "slotId and patientId required" });

            // 1. Verify guardian is linked to this patient
            console.log(`[Booking] Checking relationship for Guardian ${guardianPersonId} and Patient ${patientId}`);
            const rpCheck = await aidboxClient.get('/RelatedPerson', {
                params: {
                    identifier: `https://hcbs-platform.com/guardian-person-id|${guardianPersonId}`,
                    patient: `Patient/${patientId}`
                }
            });
            console.log(`[Booking] RP Check Result: ${JSON.stringify(rpCheck.data)}`);
            if ((rpCheck.data.entry || []).length === 0) {
                console.warn("[Booking] Guardian not linked to patient");
                return res.status(403).json({ error: "You are not a guardian for this patient" });
            }

            // 2. Check Slot Status
            const slotRes = await aidboxClient.get(`/Slot/${slotId}`);
            const slot = slotRes.data;
            console.log(`[Booking] Slot Status: ${slot.status}`);
            if (slot.status !== 'free') {
                return res.status(409).json({ error: "Slot is no longer available" });
            }

            // 3. Prepare Appointment
            const appointmentId = uuidv4();
            const appointment: any = {
                resourceType: "Appointment",
                id: appointmentId,
                status: "booked",
                start: slot.start,
                end: slot.end,
                slot: [{ reference: `Slot/${slotId}` }],
                participant: [
                    { actor: { reference: `Patient/${patientId}` }, status: "accepted" }
                ],
                reasonCode: [{ text: reason || 'Scheduled by guardian' }]
            };

            // Fetch schedule to get practitioner
            try {
                const scheduleRes = await aidboxClient.get(`/${slot.schedule.reference}`);
                const schedule = scheduleRes.data;
                if (schedule.actor && schedule.actor.length > 0) {
                    appointment.participant.push({ actor: schedule.actor[0], status: "accepted" });
                }
            } catch (e) {
                console.warn("Could not fetch schedule details for appointment");
            }

            // 4. Atomic Transaction: Create Appointment + Update Slot
            console.log(`[Booking] Submitting transaction for Appointment ${appointmentId}`);
            await aidboxClient.post('/', {
                resourceType: "Bundle",
                type: "transaction",
                entry: [
                    {
                        resource: appointment,
                        request: { method: "PUT", url: `/Appointment/${appointmentId}` }
                    },
                    {
                        resource: { ...slot, status: "busy" },
                        request: { method: "PUT", url: `/Slot/${slotId}` }
                    }
                ]
            });

            // 5. Try to notify Restate asynchronously (ignore error if ingress missing)
            try {
                const restateUrl = `http://${config.restate.host}:${config.restate.port}/appointment/bookAppointment`;
                axios.post(restateUrl, { slotId, patientId, reason }, { timeout: 1000 }).catch(() => { });
            } catch (e) { }

            res.status(201).json({
                message: "Appointment booked successfully",
                appointmentId
            });
        } catch (error: any) {
            const msg = error.response?.data || error.message;
            console.error("Book Appointment Error:", msg);
            res.status(500).json({ error: `Failed to book appointment: ${JSON.stringify(msg)}` });
        }
    },

    // Get all recipients (enriched with practitioners and care plans)
    async getPatients(req: Request, res: Response) {
        try {
            const guardianPersonId = req.user?.fhirResourceId;
            if (!guardianPersonId) return res.status(400).json({ error: "User not linked to a Person resource" });

            // 1. Get Linked Patients via RelatedPerson
            const response = await aidboxClient.get('/RelatedPerson', {
                params: {
                    identifier: `https://hcbs-platform.com/guardian-person-id|${guardianPersonId}`,
                    _include: 'RelatedPerson:patient'
                }
            });

            const entries = response.data.entry || [];
            const patients = entries
                .filter((e: { resource: Record<string, unknown> }) => e.resource.resourceType === 'Patient')
                .map((e: { resource: Record<string, unknown> }) => e.resource);

            // 2. Fetch details for each patient (Practitioners & CarePlans)
            const enrichedPatients = await Promise.all(patients.map(async (patient: any) => {
                // A. Fetch CareTeam to find Practitioners
                const careTeamRes = await aidboxClient.get('/CareTeam', {
                    params: { subject: `Patient/${patient.id}`, status: 'active' }
                });
                const careTeams = (careTeamRes.data.entry || []).map((e: any) => e.resource);

                const practitioners: any[] = [];
                careTeams.forEach((ct: any) => {
                    ct.participant?.forEach((p: any) => {
                        if (p.member?.reference?.startsWith('Practitioner/')) {
                            practitioners.push({
                                id: p.member.reference.split('/')[1],
                                name: p.member.display || 'Unknown Practitioner',
                                role: p.role?.[0]?.coding?.[0]?.display || 'Member'
                            });
                        }
                    });
                });

                // B. Fetch CarePlans
                const carePlanRes = await aidboxClient.get('/CarePlan', {
                    params: { subject: `Patient/${patient.id}`, status: 'active' }
                });
                const carePlans = (carePlanRes.data.entry || []).map((e: any) => ({
                    id: e.resource.id,
                    title: e.resource.title || 'Untitled Care Plan',
                    status: e.resource.status,
                    description: e.resource.description
                }));

                return {
                    ...patient,
                    practitioners, // Array of { id, name, role }
                    carePlans      // Array of { id, title, status, description }
                };
            }));

            res.json(enrichedPatients);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            console.error("Get Guardian Recipients Error:", msg);
            res.status(500).json({ error: "Failed to fetch recipients" });
        }
    }
};
