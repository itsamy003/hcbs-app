import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get the host IP dynamically for Expo Go (physical device)
// Fallback to localhost for web/simulators
const host = Constants.expoConfig?.hostUri?.split(':')[0] || 'localhost';
const BASE_URL = `http://${host}:3000`;

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
