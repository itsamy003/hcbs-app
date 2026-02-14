import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Try loading from root or local

export const config = {
    port: process.env.RESTATE_SERVICE_PORT || 9081,
    aidbox: {
        baseUrl: process.env.AIDBOX_BASE_URL || 'http://127.0.0.1:8080/fhir',
        clientId: process.env.AIDBOX_CLIENT_ID || 'root',
        clientSecret: process.env.AIDBOX_CLIENT_SECRET || '6xJ9RhtVB2',
    },
};
