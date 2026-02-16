import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/authStore';
import api from '../api/api';
import { useNavigation } from '@react-navigation/native';
import { Lock, Mail } from 'lucide-react-native';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { setAuth } = useAuthStore();

    const handleLogin = async () => {
        if (!email || !password) return;
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, user } = response.data;
            await setAuth(token, user);
            // Navigation handled by App.tsx token state
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Login failed. Check credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>HCBS Platform</Text>
                <Text style={styles.subtitle}>Sign in to your account</Text>
            </View>

            <View style={styles.form}>
                <View style={styles.inputContainer}>
                    <Mail color="#6b7280" size={20} />
                    <TextInput
                        style={styles.input}
                        placeholder="Email address"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Lock color="#6b7280" size={20} />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Sign In</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#f9fafb',
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 8,
    },
    form: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
        height: 50,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#374151',
    },
    button: {
        backgroundColor: '#4f46e5', // indigo-600
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    errorText: {
        color: '#ef4444',
        textAlign: 'center',
        marginBottom: 16,
    },
});
