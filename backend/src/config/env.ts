import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    aidbox: {
        baseUrl: process.env.AIDBOX_BASE_URL || 'http://127.0.0.1:8080/fhir',
        clientId: process.env.AIDBOX_CLIENT_ID || 'root',
        clientSecret: process.env.AIDBOX_CLIENT_SECRET || '6xJ9RhtVB2',
    },
    restate: {
        host: process.env.RESTATE_HOST || 'localhost',
        port: parseInt(process.env.RESTATE_PORT || '9080', 10),
    },
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-me-in-prod',
};
