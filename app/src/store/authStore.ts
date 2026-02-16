import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
    id: string;
    email: string;
    role: 'practitioner' | 'patient' | 'guardian' | 'admin';
    fhirResourceId: string;
}

interface AuthState {
    token: string | null;
    user: User | null;
    isLoading: boolean;
    setAuth: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    loadToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    user: null,
    isLoading: true,
    setAuth: async (token, user) => {
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(user));
        set({ token, user });
    },
    logout: async () => {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
        set({ token: null, user: null });
    },
    loadToken: async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const userStr = await SecureStore.getItemAsync('user');
            if (token && userStr) {
                set({ token, user: JSON.parse(userStr), isLoading: false });
            } else {
                set({ token: null, user: null, isLoading: false });
            }
        } catch (e) {
            console.error('Failed to load token', e);
            set({ token: null, user: null, isLoading: false });
        }
    },
}));
