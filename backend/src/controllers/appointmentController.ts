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
        let params: any = { _sort: '-date' };
        try {
            const user = req.user!;

            if (user.role === 'practitioner') {
                params['actor'] = `Practitioner/${user.fhirResourceId}`;
                params['_include'] = 'Appointment:patient';
                if (req.query.patientId) {
                    params['patient'] = `Patient/${req.query.patientId}`;
                }

                // Fetch Appointments
                const aptResponse = await aidboxClient.get('/Appointment', { params });
                const entries = aptResponse.data.entry || [];

                // Map patient names from included resources
                const patientsById = new Map();
                entries.forEach((e: any) => {
                    if (e.resource.resourceType === 'Patient') {
                        patientsById.set(e.resource.id, e.resource);
                    }
                });

                const appointments = entries
                    .filter((e: any) => e.resource.resourceType === 'Appointment')
                    .map((e: any) => {
                        const apt = e.resource;
                        const patientRef = apt.participant?.find((p: any) => p.actor?.reference?.startsWith('Patient/'))?.actor?.reference;
                        const patientId = patientRef?.split('/')[1];
                        const patient = patientsById.get(patientId);

                        let patientName = 'Patient';
                        if (patient && patient.name?.[0]) {
                            const given = patient.name[0].given?.join(' ') || '';
                            const family = patient.name[0].family || '';
                            patientName = `${given} ${family}`.trim() || 'Patient';
                        }

                        return {
                            id: apt.id,
                            start: apt.start,
                            end: apt.end,
                            status: apt.status,
                            patientName
                        };
                    });

                // Fetch SLOTS (availability) - Only if not filtering by a specific patient
                let slots: any[] = [];
                if (!req.query.patientId) {
                    const scheduleResponse = await aidboxClient.get('/Schedule', {
                        params: { actor: `Practitioner/${user.fhirResourceId}`, _elements: 'id' }
                    });
                    const scheduleIds = (scheduleResponse.data.entry || []).map((e: any) => e.resource.id);

                    if (scheduleIds.length > 0) {
                        const slotResponse = await aidboxClient.get('/Slot', {
                            params: {
                                status: 'free',
                                schedule: scheduleIds.join(','),
                                _sort: 'start'
                            }
                        });
                        slots = (slotResponse.data.entry || []).map((e: any) => ({
                            id: e.resource.id,
                            start: e.resource.start,
                            end: e.resource.end,
                            status: 'available'
                        }));
                    }
                }

                // Combine and return
                return res.json([...appointments, ...slots]);
            }

            // Fallback for other roles (simplified for now)
            if (user.role === 'patient') {
                params['actor'] = `Patient/${user.fhirResourceId}`;
            } else if (user.role === 'guardian') {
                if (req.query.patientId) {
                    params['patient'] = `Patient/${req.query.patientId}`;
                }
            }
            params['_include'] = 'Appointment:practitioner';

            const response = await aidboxClient.get('/Appointment', { params });
            const entries = response.data.entry || [];

            // Map practitioners from includes
            const practitionersById = new Map();
            entries.forEach((e: any) => {
                if (e.resource.resourceType === 'Practitioner') {
                    practitionersById.set(e.resource.id, e.resource);
                }
            });

            const appointments = entries
                .filter((e: any) => e.resource.resourceType === 'Appointment')
                .map((e: any) => {
                    const apt = e.resource;
                    const practitionerRef = apt.participant?.find((p: any) => p.actor?.reference?.startsWith('Practitioner/'))?.actor?.reference;
                    const practitionerId = practitionerRef?.split('/')[1];
                    const practitioner = practitionersById.get(practitionerId);

                    let practitionerName = 'Practitioner';
                    let practitionerSpecialty = '';
                    if (practitioner) {
                        const given = practitioner.name?.[0]?.given?.join(' ') || '';
                        const family = practitioner.name?.[0]?.family || '';
                        practitionerName = `${given} ${family}`.trim() || 'Practitioner';
                        practitionerSpecialty = practitioner.qualification?.[0]?.code?.text || '';
                    }

                    return {
                        ...apt,
                        practitionerName,
                        practitionerSpecialty
                    };
                });

            res.json(appointments);

        } catch (error: any) {
            const detail = error.response?.data || error.message;
            console.error("Get Appointments Error:", JSON.stringify(detail, null, 2));
            res.status(500).json({ error: "Failed to fetch appointments", detail });
        }
    }
};
