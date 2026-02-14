import * as restate from "@restatedev/restate-sdk";
import aidboxClient from "../config/aidbox";
import { v4 as uuidv4 } from "uuid";

export const guardianService = restate.service({
    name: "guardian",
    handlers: {
        addPatient: async (ctx, event: { guardianPersonId: string, patientData: { firstName: string, lastName: string, dob: string, email?: string } }) => {
            const { guardianPersonId, patientData } = event;
            const ctxLog = ctx.console;

            ctxLog.info(`Starting addPatient workflow for guardian ${guardianPersonId}`);

            // 1. Create Patient
            // We use a deterministic UUID based on patient data if we want idempotency on CREATE, 
            // but here we might rely on Restate's execution ID or just generate new one.
            // Ideally, we search for existing patient first.
            // For simplicity in this demo, we create a new random UUID.
            const patientId = await ctx.run("createPatient", async () => {
                const pid = uuidv4();
                await aidboxClient.put(`/Patient/${pid}`, {
                    resourceType: "Patient",
                    id: pid,
                    name: [{ given: [patientData.firstName], family: patientData.lastName }],
                    birthDate: patientData.dob,
                    telecom: patientData.email ? [{ system: "email", value: patientData.email }] : []
                });
                return pid;
            });

            ctxLog.info(`Created Patient: ${patientId}`);

            // 2. Create RelatedPerson
            // This links the Guardian (Person) to the Patient
            // Note: FHIR RelatedPerson.patient refers to the Patient.
            // But standard RelatedPerson doesn't strictly reference a 'Person' resource for the *agent* except via identifier or name.
            // PROPER MODELING: Use RelatedPerson.patient -> Patient. And possibly an extension or identifier to link to the Guardian User/Person.
            // Or if the Guardian IS a RelatedPerson resource.
            // We will create a RelatedPerson resource that represents the guardian FOR THIS PATIENT.
            // And we link it to the Guardian's Person resource via identifier or tag, to easily find "all related persons for this guardian".
            const relatedPersonId = await ctx.run("createRelatedPerson", async () => {
                const rpid = uuidv4();
                await aidboxClient.put(`/RelatedPerson/${rpid}`, {
                    resourceType: "RelatedPerson",
                    id: rpid,
                    patient: { reference: `Patient/${patientId}` },
                    relationship: [{
                        coding: [{
                            system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
                            code: "GRDTH",
                            display: "Grandfather" // Just example, or Generic Guardian
                        }]
                    }],
                    // Link back to the Guardian's generic Person ID for aggregation
                    identifier: [{ system: "https://hcbs-platform.com/guardian-person-id", value: guardianPersonId }]
                });
                return rpid;
            });

            ctxLog.info(`Created RelatedPerson: ${relatedPersonId}`);

            // 3. Update/Create CareTeam
            await ctx.run("updateCareTeam", async () => {
                // Create a care team if not exists
                const careTeamId = uuidv4();
                // We should probably search for existing CareTeam for this patient first?
                // Since we just created the patient, we know it doesn't exist.
                await aidboxClient.put(`/CareTeam/${careTeamId}`, {
                    resourceType: "CareTeam",
                    status: "active",
                    subject: { reference: `Patient/${patientId}` },
                    name: `${patientData.firstName}'s Care Team`,
                    participant: [
                        {
                            member: { reference: `RelatedPerson/${relatedPersonId}` },
                            role: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", code: "GRD" }] }]
                        }
                    ]
                });
            });

            return { patientId, relatedPersonId };
        },

        removePatient: async (ctx, event: { guardianPersonId: string, patientId: string }) => {
            // Implementation for removing patient
            const { guardianPersonId, patientId } = event;
            // 1. Find RelatedPerson
            // 2. Delete RelatedPerson
            // 3. Update CareTeam
            // 4. Record consent revocation?
            return { status: "removed" };
        }
    }
});
