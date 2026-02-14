import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';

export default function PatientDashboard() {

    const { data: careTeam } = useQuery({
        queryKey: ['careTeam'],
        queryFn: async () => {
            const res = await api.get('/patient/care-team');
            return res.data; // Array of CareTeam resources
        }
    });

    const { data: appointments } = useQuery({
        queryKey: ['appointments'],
        queryFn: async () => {
            const res = await api.get('/appointments');
            return res.data;
        }
    });

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Patient Dashboard</h2>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Care Team & Care Plan */}
                <div className="rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 text-lg font-medium">My Care Team</h3>
                    {careTeam && careTeam.length > 0 ? (
                        careTeam.map((ct: any) => (
                            <div key={ct.id} className="mb-4">
                                <h4 className="font-semibold">{ct.name}</h4>
                                <ul className="mt-2 space-y-2">
                                    {ct.participant?.map((p: any, idx: number) => (
                                        <li key={idx} className="flex items-center text-sm text-gray-700">
                                            <span className="font-medium mr-2">{p.member?.display || 'Unknown Member'}</span>
                                            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600">
                                                {p.role?.[0]?.coding?.[0]?.display || p.role?.[0]?.coding?.[0]?.code || 'Member'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    ) : <p className="text-gray-500">No Care Team found.</p>}

                    <hr className="my-6" />
                    <h3 className="mb-4 text-lg font-medium">My Care Plans</h3>
                    <MyCarePlans />
                </div>

                {/* Appointments */}
                <div className="rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 text-lg font-medium">My Appointments</h3>
                    <ul className="divide-y divide-gray-200">
                        {appointments?.length === 0 && <p className="text-gray-500">No appointments.</p>}
                        {appointments?.map((apt: any) => (
                            <li key={apt.id} className="py-4">
                                <div className="flex justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">{format(new Date(apt.start), 'PPpp')}</p>
                                        <p className="text-sm text-gray-500">{apt.reasonCode?.[0]?.text || 'No reason specified'}</p>
                                    </div>
                                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                        {apt.status}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

function MyCarePlans() {
    const { data: carePlans, isLoading } = useQuery({
        queryKey: ['my-careplans'],
        queryFn: async () => {
            const user = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.user;
            if (!user?.fhirResourceId) return [];

            const res = await api.get(`/careplans/patient/${user.fhirResourceId}`);
            return res.data;
        }
    });

    if (isLoading) return <p>Loading plans...</p>;
    if (!carePlans || carePlans.length === 0) return <p className="text-gray-500">No care plans.</p>;

    return (
        <ul className="space-y-4">
            {carePlans.map((cp: any) => (
                <li key={cp.id} className="border p-4 rounded bg-blue-50">
                    <h4 className="font-bold text-blue-900">{cp.title}</h4>
                    <p className="text-sm text-gray-700">{cp.description}</p>
                    <div className="mt-2 text-xs text-gray-500">
                        Status: <span className="font-semibold">{cp.status}</span>
                    </div>
                </li>
            ))}
        </ul>
    );
}
