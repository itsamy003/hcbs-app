import aidboxClient from '../config/aidbox';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { v4 as uuidv4 } from 'uuid';

export const AuthService = {
    async signupPractitioner(data: { email: string; password: string; firstName: string; lastName: string; specialty?: string }) {
        // 1. Create Practitioner
        const practitionerId = uuidv4();
        await aidboxClient.put(`/Practitioner/${practitionerId}`, {
            resourceType: 'Practitioner',
            id: practitionerId,
            name: [{ given: [data.firstName], family: data.lastName }],
            telecom: [{ system: 'email', value: data.email }],
            qualification: data.specialty ? [{
                code: { text: data.specialty }
            }] : undefined,
        });

        // 2. Create User
        const userId = uuidv4();
        await aidboxClient.put(`/User/${userId}`, {
            resourceType: 'User',
            id: userId,
            email: data.email,
            password: data.password,
            fhirUser: { resourceType: 'Practitioner', id: practitionerId }, // Link to Practitioner
            data: { role: 'practitioner' },
        });

        return { userId, practitionerId };
    },

    async signupPatient(data: { email: string; password: string; firstName: string; lastName: string; dob: string }) {
        // 1. Create Patient
        const patientId = uuidv4();
        await aidboxClient.put(`/Patient/${patientId}`, {
            resourceType: 'Patient',
            id: patientId,
            name: [{ given: [data.firstName], family: data.lastName }],
            birthDate: data.dob,
            telecom: [{ system: 'email', value: data.email }],
        });

        // 2. Create Consent (Default Allow)
        await aidboxClient.post('/Consent', {
            resourceType: 'Consent',
            status: 'active',
            scope: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/consentscope', code: 'patient-privacy' }] },
            category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'INFA' }] }],
            patient: { reference: `Patient/${patientId}` },
            policyRule: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'OPTIN' }] },
        });

        // 3. Create Empty CareTeam
        await aidboxClient.post('/CareTeam', {
            resourceType: 'CareTeam',
            status: 'active',
            subject: { reference: `Patient/${patientId}` },
            name: `${data.firstName}'s Care Team`,
        });

        // 4. Create User
        const userId = uuidv4();
        await aidboxClient.put(`/User/${userId}`, {
            resourceType: 'User',
            id: userId,
            email: data.email,
            password: data.password,
            fhirUser: { resourceType: 'Patient', id: patientId },
            data: { role: 'patient' },
        });

        return { userId, patientId };
    },

    async signupGuardian(data: { email: string; password: string; firstName: string; lastName: string }) {
        // 1. Create RelatedPerson (Initially unlinked to any patient, or just a generic person first?)
        // FHIR RelatedPerson usually requires a patient.
        // However, the dashboard allows adding patients LATER.
        // So strictly speaking, we might need a Person resource or a standalone RelatedPerson if Aidbox allows loose constraints.
        // Better approach: Create a Person resource for the Identity, and RelatedPerson(s) are created when they link to a Patient.
        // But for simplicity/dashboard role, let's create a User that has role 'guardian'.
        // The link to 'Person' (Identity) is good practice.

        const personId = uuidv4();
        await aidboxClient.put(`/Person/${personId}`, {
            resourceType: 'Person',
            id: personId,
            name: [{ given: [data.firstName], family: data.lastName }],
            telecom: [{ system: 'email', value: data.email }],
        });

        // 2. Create User
        const userId = uuidv4();
        await aidboxClient.put(`/User/${userId}`, {
            resourceType: 'User',
            id: userId,
            email: data.email,
            password: data.password,
            fhirUser: { resourceType: 'Person', id: personId },
            data: { role: 'guardian' },
        });

        return { userId, personId };
    },

    async login(email: string, password: string) {
        try {
            // 1. Look up the user by email to get their Aidbox User ID
            const userSearchResponse = await aidboxClient.get('/User', {
                params: { email: email },
            });

            const users = userSearchResponse.data.entry || [];
            if (users.length === 0) {
                throw new Error('No user found with this email');
            }
            const user = users[0].resource;

            // 2. Authenticate against Aidbox using the user's ID (not email)
            //    Aidbox's password grant expects the User resource ID as "username"
            const authBaseUrl = config.aidbox.baseUrl.replace(/\/fhir\/?$/, '');
            const axios = require('axios');

            await axios.post(`${authBaseUrl}/auth/token`,
                `grant_type=password&client_id=hcbs-backend&client_secret=hcbs-backend-secret&username=${user.id}&password=${encodeURIComponent(password)}`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            // Helper to get ID from fhirUser (handles both Aidbox and FHIR formats)
            const getFhirResourceId = (fhirUser: any) => {
                if (!fhirUser) return undefined;
                if (fhirUser.id) return fhirUser.id;
                if (fhirUser.reference) return fhirUser.reference.split('/')[1];
                return undefined;
            };

            const fhirResourceId = getFhirResourceId(user.fhirUser);

            // 3. If we reach here, Aidbox confirmed the password is correct.
            //    Generate our own JWT for the frontend.
            const token = jwt.sign(
                {
                    sub: user.id,
                    role: user.data?.role,
                    fhirResourceId: fhirResourceId,
                    email: user.email,
                },
                config.jwtSecret,
                { expiresIn: '24h' }
            );

            return {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.data?.role,
                    fhirResourceId: fhirResourceId,
                },
            };

        } catch (error: any) {
            console.error('Login Error:', error.response?.data || error.message);
            throw new Error('Invalid credentials');
        }
    },
};
