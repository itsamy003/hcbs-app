import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * Redirects the user to their role-specific dashboard.
 * Used as the index route so that / always goes to the right place.
 */
export function RoleRedirect() {
    const { token, user } = useAuthStore();

    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    switch (user.role) {
        case 'practitioner':
            return <Navigate to="/practitioner" replace />;
        case 'guardian':
            return <Navigate to="/guardian" replace />;
        case 'patient':
            return <Navigate to="/patient" replace />;
        default:
            return <Navigate to="/login" replace />;
    }
}
