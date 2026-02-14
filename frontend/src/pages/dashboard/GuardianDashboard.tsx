import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';

export default function GuardianDashboard() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Guardian Dashboard</h2>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SearchAndLinkPatient />
                <MyDependents />
            </div>
        </div>
    );
}

/* ─── Search & Link an existing patient ─── */
function SearchAndLinkPatient() {
    const [searchName, setSearchName] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const queryClient = useQueryClient();

    const search = async () => {
        if (!searchName.trim()) return;
        setSearching(true);
        try {
            const res = await api.get('/guardian/search-patients', { params: { name: searchName } });
            setResults(res.data);
        } catch { setResults([]); }
        setSearching(false);
    };

    const linkMutation = useMutation({
        mutationFn: async (patientId: string) => api.post('/guardian/link-patient', { patientId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['guardian-patients'] });
            setResults([]);
            setSearchName('');
        }
    });

    return (
        <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium">Search & Link Patient</h3>
            <div className="flex gap-2 mb-4">
                <input
                    className="flex-1 rounded-md border p-2 text-sm"
                    placeholder="Search by patient name..."
                    value={searchName}
                    onChange={e => setSearchName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && search()}
                />
                <button
                    onClick={search}
                    disabled={searching}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                    {searching ? '...' : 'Search'}
                </button>
            </div>

            {results.length > 0 && (
                <ul className="border rounded divide-y max-h-48 overflow-y-auto">
                    {results.map((p: any) => (
                        <li key={p.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                            <div>
                                <p className="font-medium text-sm">{p.name?.[0]?.given?.join(' ')} {p.name?.[0]?.family}</p>
                                <p className="text-xs text-gray-500">DOB: {p.birthDate || 'N/A'}</p>
                            </div>
                            <button
                                onClick={() => linkMutation.mutate(p.id)}
                                disabled={linkMutation.isPending}
                                className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                            >
                                {linkMutation.isPending ? '...' : 'Link'}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {results.length === 0 && searchName && !searching && (
                <p className="text-sm text-gray-500">No patients found.</p>
            )}
        </div>
    );
}

/* ─── My Dependents with Assign Practitioner & Book ─── */
function MyDependents() {
    const { data: patients, isLoading, error } = useQuery({
        queryKey: ['guardian-patients'],
        queryFn: async () => {
            const res = await api.get('/guardian/patients');
            return res.data;
        }
    });

    if (isLoading) return <div className="rounded-lg bg-white p-6 shadow"><p>Loading dependents...</p></div>;
    if (error) return <div className="rounded-lg bg-white p-6 shadow"><p className="text-red-500">Failed to load dependents.</p></div>;

    return (
        <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium">My Dependents</h3>
            {!patients || patients.length === 0 ? (
                <p className="text-gray-500">No dependents linked yet. Use search to find and link patients.</p>
            ) : (
                <div className="space-y-4">
                    {patients.map((p: any) => (
                        <PatientCard key={p.id} patient={p} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Per-patient card with actions ─── */
function PatientCard({ patient }: { patient: any }) {
    const [showAssign, setShowAssign] = useState(false);
    const [showBook, setShowBook] = useState(false);

    return (
        <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-medium text-gray-900">
                        {patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family}
                    </p>
                    <p className="text-sm text-gray-500">DOB: {patient.birthDate || 'N/A'}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    Active
                </span>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => { setShowAssign(!showAssign); setShowBook(false); }}
                    className="rounded bg-purple-600 px-3 py-1.5 text-xs text-white hover:bg-purple-700"
                >
                    {showAssign ? 'Hide' : 'Assign Practitioner'}
                </button>
                <button
                    onClick={() => { setShowBook(!showBook); setShowAssign(false); }}
                    className="rounded bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-700"
                >
                    {showBook ? 'Hide' : 'Book Appointment'}
                </button>
            </div>

            {showAssign && <AssignPractitioner patientId={patient.id} />}
            {showBook && <BookAppointment patientId={patient.id} />}
        </div>
    );
}

/* ─── Assign Practitioner sub-component ─── */
function AssignPractitioner({ patientId }: { patientId: string }) {
    const [searchName, setSearchName] = useState('');
    const [practitioners, setPractitioners] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const search = async () => {
        setSearching(true);
        try {
            const res = await api.get('/guardian/search-practitioners', { params: { name: searchName || undefined } });
            setPractitioners(res.data);
        } catch { setPractitioners([]); }
        setSearching(false);
    };

    const assignMutation = useMutation({
        mutationFn: async (practitionerId: string) =>
            api.post('/guardian/assign-practitioner', { patientId, practitionerId }),
        onSuccess: () => alert('Practitioner assigned!')
    });

    return (
        <div className="bg-purple-50 rounded p-3 space-y-2">
            <div className="flex gap-2">
                <input
                    className="flex-1 rounded border p-1.5 text-sm"
                    placeholder="Search practitioner..."
                    value={searchName}
                    onChange={e => setSearchName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && search()}
                />
                <button onClick={search} disabled={searching} className="rounded bg-purple-600 px-3 py-1 text-xs text-white">
                    {searching ? '...' : 'Search'}
                </button>
            </div>
            {practitioners.length > 0 && (
                <ul className="border rounded divide-y bg-white max-h-36 overflow-y-auto">
                    {practitioners.map((pr: any) => (
                        <li key={pr.id} className="p-2 flex items-center justify-between text-sm hover:bg-gray-50">
                            <span>{pr.name?.[0]?.given?.join(' ')} {pr.name?.[0]?.family}</span>
                            <button
                                onClick={() => assignMutation.mutate(pr.id)}
                                disabled={assignMutation.isPending}
                                className="rounded bg-purple-600 px-2 py-0.5 text-xs text-white"
                            >
                                Assign
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/* ─── Book Appointment sub-component ─── */
function BookAppointment({ patientId }: { patientId: string }) {
    const [practitionerId, setPractitionerId] = useState('');
    const [practitioners, setPractitioners] = useState<any[]>([]);
    const [slots, setSlots] = useState<any[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Load practitioners on mount
    const loadPractitioners = async () => {
        try {
            const res = await api.get('/guardian/search-practitioners');
            setPractitioners(res.data);
        } catch { /* ignore */ }
    };

    const loadSlots = async (prId: string) => {
        setPractitionerId(prId);
        setLoadingSlots(true);
        try {
            const res = await api.get('/guardian/slots', { params: { practitionerId: prId } });
            setSlots(res.data);
        } catch { setSlots([]); }
        setLoadingSlots(false);
    };

    const bookMutation = useMutation({
        mutationFn: async (slotId: string) =>
            api.post('/guardian/book-appointment', { slotId, patientId, reason: 'Routine visit' }),
        onSuccess: () => {
            alert('Appointment booked!');
            // Refresh slots
            if (practitionerId) loadSlots(practitionerId);
        }
    });

    // Load practitioners when component mounts
    useState(() => { loadPractitioners(); });

    return (
        <div className="bg-teal-50 rounded p-3 space-y-2">
            <p className="text-sm font-medium text-teal-900">Select Practitioner:</p>
            <div className="flex flex-wrap gap-2">
                {practitioners.map((pr: any) => (
                    <button
                        key={pr.id}
                        onClick={() => loadSlots(pr.id)}
                        className={`rounded px-3 py-1 text-xs ${practitionerId === pr.id ? 'bg-teal-700 text-white' : 'bg-white border text-gray-700 hover:bg-teal-100'}`}
                    >
                        {pr.name?.[0]?.given?.join(' ')} {pr.name?.[0]?.family}
                    </button>
                ))}
                {practitioners.length === 0 && <p className="text-xs text-gray-500">No practitioners found.</p>}
            </div>

            {practitionerId && (
                <div className="mt-2">
                    <p className="text-sm font-medium text-teal-900">Available Slots:</p>
                    {loadingSlots ? <p className="text-xs">Loading...</p> : (
                        slots.length === 0 ? (
                            <p className="text-xs text-gray-500">No free slots available.</p>
                        ) : (
                            <ul className="border rounded divide-y bg-white max-h-40 overflow-y-auto">
                                {slots.map((s: any) => (
                                    <li key={s.id} className="p-2 flex items-center justify-between text-sm hover:bg-gray-50">
                                        <span>{format(new Date(s.start), 'MMM d, yyyy h:mm a')} – {format(new Date(s.end), 'h:mm a')}</span>
                                        <button
                                            onClick={() => bookMutation.mutate(s.id)}
                                            disabled={bookMutation.isPending}
                                            className="rounded bg-teal-600 px-2 py-0.5 text-xs text-white"
                                        >
                                            Book
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
