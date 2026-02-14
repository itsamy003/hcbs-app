import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';

export default function PractitionerDashboard() {
    const [availability, setAvailability] = useState({ start: '', end: '', duration: 30 });

    // Fetch Appointments
    const { data: appointments, isLoading } = useQuery({
        queryKey: ['appointments'],
        queryFn: async () => {
            const res = await api.get('/appointments');
            return res.data;
        }
    });

    // Post Availability
    const mutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post('/practitioner/availability', {
                start: new Date(data.start).toISOString(),
                end: new Date(data.end).toISOString(),
                durationMinutes: parseInt(data.duration)
            });
        },
        onSuccess: () => {
            alert("Availability Posted!");
            setAvailability({ start: '', end: '', duration: 30 });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(availability);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Practitioner Dashboard</h2>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Availability Form */}
                <div className="rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 text-lg font-medium">Post Availability</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Start Time</label>
                            <input
                                type="datetime-local"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={availability.start}
                                onChange={e => setAvailability({ ...availability, start: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">End Time</label>
                            <input
                                type="datetime-local"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={availability.end}
                                onChange={e => setAvailability({ ...availability, end: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Slot Duration (minutes)</label>
                            <input
                                type="number"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={availability.duration}
                                onChange={e => setAvailability({ ...availability, duration: parseInt(e.target.value) || 30 })}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {mutation.isPending ? 'Posting...' : 'Post Schedule'}
                        </button>
                    </form>
                </div>

                {/* Appointments List */}
                <div className="rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 text-lg font-medium">Upcoming Appointments</h3>
                    {isLoading ? <p>Loading...</p> : (
                        <ul className="divide-y divide-gray-200">
                            {appointments?.length === 0 && <p className="text-gray-500">No appointments found.</p>}
                            {appointments?.map((apt: any) => (
                                <li key={apt.id} className="py-4">
                                    <div className="flex justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">{format(new Date(apt.start), 'PPpp')}</p>
                                            <p className="text-sm text-gray-500">Duration: 30 mins</p>
                                        </div>
                                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                            {apt.status}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Patient Management Section */}
            <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-lg font-medium">Patient Management</h3>
                <PatientManagement />
            </div>
        </div>
    );
}

function PatientManagement() {
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [carePlanTitle, setCarePlanTitle] = useState('');
    const [carePlanDesc, setCarePlanDesc] = useState('');

    // Fetch Patients
    const { data: patients, isLoading } = useQuery({
        queryKey: ['practitioner-patients'],
        queryFn: async () => {
            const res = await api.get('/practitioner/patients');
            return res.data;
        }
    });

    // Create CarePlan Mutation
    const createCarePlanMutation = useMutation({
        mutationFn: async () => {
            if (!selectedPatientId) return;
            return api.post('/careplans', {
                patientId: selectedPatientId,
                title: carePlanTitle,
                description: carePlanDesc,
                status: 'active'
            });
        },
        onSuccess: () => {
            alert("Care Plan Created!");
            setCarePlanTitle('');
            setCarePlanDesc('');
        }
    });

    if (isLoading) return <p>Loading patients...</p>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* List of Patients */}
            <div>
                <h4 className="font-semibold mb-2">My Patients</h4>
                {patients?.length === 0 && <p className="text-gray-500">No patients assigned (or you are not in their Care Team).</p>}
                <ul className="border rounded divide-y max-h-60 overflow-y-auto">
                    {patients?.map((p: any) => (
                        <li
                            key={p.id}
                            className={`p-3 cursor-pointer hover:bg-gray-50 ${selectedPatientId === p.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                            onClick={() => setSelectedPatientId(p.id)}
                        >
                            <p className="font-medium">{p.name?.[0]?.given?.join(' ')} {p.name?.[0]?.family}</p>
                            <p className="text-xs text-gray-500">ID: {p.id}</p>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Actions for Selected Patient */}
            <div className="border rounded p-4 bg-gray-50">
                {selectedPatientId ? (
                    <>
                        <h4 className="font-semibold mb-4">Create Care Plan</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium">Title</label>
                                <input className="w-full border rounded p-2" value={carePlanTitle} onChange={e => setCarePlanTitle(e.target.value)} placeholder="e.g. Daily Rehab" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Description</label>
                                <textarea className="w-full border rounded p-2" value={carePlanDesc} onChange={e => setCarePlanDesc(e.target.value)} placeholder="Details..." />
                            </div>
                            <button
                                onClick={() => createCarePlanMutation.mutate()}
                                disabled={createCarePlanMutation.isPending}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full"
                            >
                                {createCarePlanMutation.isPending ? 'Creating...' : 'Create Care Plan'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                        Select a patient to View/Manage
                    </div>
                )}
            </div>
        </div>
    );
}
