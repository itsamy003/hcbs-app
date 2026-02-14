import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import PractitionerDashboard from '../pages/dashboard/PractitionerDashboard';
import PatientDashboard from '../pages/dashboard/PatientDashboard';
import GuardianDashboard from '../pages/dashboard/GuardianDashboard';
import DashboardLayout from '../layouts/DashboardLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { RoleRedirect } from '../components/RoleRedirect';

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/',
        element: <DashboardLayout />,
        children: [
            {
                index: true,
                element: <RoleRedirect />,
            },
            {
                path: 'practitioner',
                element: <ProtectedRoute allowedRoles={['practitioner']}><PractitionerDashboard /></ProtectedRoute>
            },
            {
                path: 'guardian',
                element: <ProtectedRoute allowedRoles={['guardian']}><GuardianDashboard /></ProtectedRoute>
            },
            {
                path: 'patient',
                element: <ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>
            },
        ]
    },
]);
