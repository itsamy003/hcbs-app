import axios from 'axios';
import { config } from './env';

const aidboxClient = axios.create({
    baseURL: config.aidbox.baseUrl,
    headers: {
        'Content-Type': 'application/fhir+json',
        'Authorization': `Basic ${Buffer.from(`${config.aidbox.clientId}:${config.aidbox.clientSecret}`).toString('base64')}`
    },
});

export default aidboxClient;
