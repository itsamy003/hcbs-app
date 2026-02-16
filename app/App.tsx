import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from './src/store/authStore';
import LoginScreen from './src/screens/LoginScreen';
import PractitionerScreen from './src/screens/PractitionerScreen';
import PatientScreen from './src/screens/PatientScreen';
import GuardianScreen from './src/screens/GuardianScreen';
import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import { User, Stethoscope, Users, LogOut } from 'lucide-react-native';

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthenticatedStack() {
    const { user, logout } = useAuthStore();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    if (route.name === 'Practitioner') return <Stethoscope color={color} size={size} />;
                    if (route.name === 'Patient') return <User color={color} size={size} />;
                    if (route.name === 'Guardian') return <Users color={color} size={size} />;
                    if (route.name === 'Logout') return <LogOut color={color} size={size} />;
                },
            })}
        >
            {user?.role === 'practitioner' && (
                <Tab.Screen name="Practitioner" component={PractitionerScreen} />
            )}
            {user?.role === 'patient' && (
                <Tab.Screen name="Patient" component={PatientScreen} />
            )}
            {user?.role === 'guardian' && (
                <Tab.Screen name="Guardian" component={GuardianScreen} />
            )}
            <Tab.Screen
                name="Logout"
                component={() => null}
                listeners={{
                    tabPress: (e) => {
                        e.preventDefault();
                        logout();
                    },
                }}
            />
        </Tab.Navigator>
    );
}

function Navigation() {
    const { token, isLoading, loadToken } = useAuthStore();

    useEffect(() => {
        loadToken();
    }, [loadToken]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {token ? (
                    <Stack.Screen name="Authenticated" component={AuthenticatedStack} />
                ) : (
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Navigation />
        </QueryClientProvider>
    );
}
