import axios from 'axios';
import { config } from './env';

const aidboxClient = axios.create({
    baseURL: config.aidbox.baseUrl,
    headers: {
        'Content-Type': 'application/fhir+json',
        'Authorization': `Basic ${Buffer.from(`${config.aidbox.clientId}:${config.aidbox.clientSecret}`).toString('base64')}`
    },
});
// Helper to handle Aidbox errors
aidboxClient.interceptors.request.use((config) => {
    console.log(`[Aidbox] Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
});

aidboxClient.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('Aidbox API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default aidboxClient;
