import { useAuthStore } from '../store/authStore';
import { useNavigate, Outlet, Link } from 'react-router-dom';
import { LogOut, Calendar, Users, Activity, Settings } from 'lucide-react';
import clsx from 'clsx';

export default function DashboardLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getDashboardPath = () => {
        switch (user?.role) {
            case 'practitioner': return '/practitioner';
            case 'patient': return '/patient';
            case 'guardian': return '/guardian';
            default: return '/';
        }
    };

    const navItems = [
        { name: 'Dashboard', href: getDashboardPath(), icon: Activity, roles: ['practitioner', 'patient', 'guardian'] },
    ];

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="hidden w-64 flex-col bg-white shadow-lg md:flex">
                <div className="flex h-16 items-center justify-center border-b px-4">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">HCBS Platform</h1>
                </div>
                <nav className="flex-1 space-y-1 px-2 py-4">
                    {navItems.filter(item => item.roles.includes(user?.role || '')).map((item) => (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={clsx(
                                "group flex items-center rounded-md px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                                // Active state logic here if needed
                            )}
                        >
                            <item.icon className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500" />
                            {item.name}
                        </Link>
                    ))}
                </nav>
                <div className="border-t p-4">
                    <div className="flex items-center">
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-700">{user?.email}</p>
                            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="mt-4 flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm md:hidden">
                    <span className="text-lg font-bold">HCBS</span>
                    {/* Mobile menu button would go here */}
                </header>

                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
