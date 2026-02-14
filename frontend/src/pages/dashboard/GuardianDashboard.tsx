import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';
import { User, ClipboardList, Stethoscope, Calendar, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface Practitioner {
    id: string;
    name: string;
    role: string;
}

interface CarePlan {
    id: string;
    title: string;
    status: string;
    description: string;
}

interface Patient {
    id: string;
    name: {
        given: string[];
        family: string;
    }[];
    birthDate?: string;
    practitioners?: Practitioner[];
    carePlans?: CarePlan[];
}

export default function GuardianDashboard() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Guardian Dashboard</h2>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SearchAndLinkPatient />
                <MyRecipients />
            </div>
        </div>
    );
}

/* ─── Search & Link an existing patient ─── */
function SearchAndLinkPatient() {
    const [searchName, setSearchName] = useState('');
    const [results, setResults] = useState<Patient[]>([]);
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
        },
        onError: (err: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const error = err as any;
            alert(error.response?.data?.error || "Failed to link patient");
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
                    {results.map((p) => (
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

/* ─── My Recipients with Assign Practitioner & Book ─── */
function MyRecipients() {
    const { data: patients, isLoading, error } = useQuery<Patient[]>({
        queryKey: ['guardian-patients'],
        queryFn: async () => {
            const res = await api.get('/guardian/patients');
            return res.data;
        }
    });

    if (isLoading) return <div className="rounded-lg bg-white p-6 shadow"><p>Loading recipients...</p></div>;
    if (error) return <div className="rounded-lg bg-white p-6 shadow"><p className="text-red-500">Failed to load recipients.</p></div>;

    return (
        <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium">My Recipients</h3>
            {!patients || patients.length === 0 ? (
                <p className="text-gray-500">No recipients linked yet. Use search to find and link patients.</p>
            ) : (
                <div className="space-y-6">
                    {patients.map((p) => (
                        <PatientCard key={p.id} patient={p} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Per-patient card with actions ─── */
function PatientCard({ patient }: { patient: Patient }) {
    const [showAssign, setShowAssign] = useState(false);
    const [showBook, setShowBook] = useState(false);

    const hasCarePlan = patient.carePlans && patient.carePlans.length > 0;

    return (
        <div className="border rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
            {/* Header: Patient Info */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-xl text-gray-900">
                            {patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family}
                        </h4>
                        <p className="text-sm text-gray-500">DOB: {patient.birthDate || 'N/A'}</p>
                    </div>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Active
                </span>
            </div>

            {/* Main Content: Care Plans & Team */}
            <div className="space-y-6">
                {hasCarePlan ? (
                    patient.carePlans?.map((plan, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                            {/* Care Plan Header */}
                            <div className="flex items-start gap-3 mb-4">
                                <ClipboardList className="w-5 h-5 text-indigo-600 mt-1" />
                                <div>
                                    <h5 className="font-bold text-gray-900 text-lg">{plan.title}</h5>
                                    <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                                    <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 uppercase tracking-wide">
                                        {plan.status}
                                    </span>
                                </div>
                            </div>

                            {/* Nested Care Team */}
                            <div className="ml-8 mt-4 border-l-2 border-indigo-100 pl-4">
                                <h6 className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                                    <Stethoscope className="w-4 h-4 text-indigo-500" />
                                    Care Team for this Plan
                                </h6>
                                {patient.practitioners && patient.practitioners.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {patient.practitioners.map((pr, pIdx) => (
                                            <div key={pIdx} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200 shadow-sm">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                    {pr.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{pr.name}</p>
                                                    <p className="text-xs text-gray-500">{pr.role}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> No practitioners assigned yet.
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    /* Fallback for No Care Plan */
                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 text-center">
                        <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <h5 className="font-medium text-gray-900">No Active Care Plans</h5>
                        <p className="text-sm text-gray-500 mb-4">This recipient currently has no assigned care plans.</p>

                        {/* Show Care Team anyway if exists */}
                        {patient.practitioners && patient.practitioners.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <h6 className="font-semibold text-gray-700 mb-3 flex items-center justify-center gap-2">
                                    <Stethoscope className="w-4 h-4" /> General Care Team
                                </h6>
                                <ul className="text-sm text-gray-600">
                                    {patient.practitioners.map((pr, i) => (
                                        <li key={i}>{pr.name} ({pr.role})</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
                <button
                    onClick={() => { setShowAssign(!showAssign); setShowBook(false); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 transition-colors"
                >
                    <LinkIcon className="w-4 h-4" />
                    {showAssign ? 'Hide Assign' : 'Assign Practitioner'}
                </button>
                <button
                    onClick={() => { setShowBook(!showBook); setShowAssign(false); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-teal-50 text-teal-700 font-medium hover:bg-teal-100 transition-colors"
                >
                    <Calendar className="w-4 h-4" />
                    {showBook ? 'Hide Booking' : 'Book Appointment'}
                </button>
            </div>

            {/* Expandable Sections */}
            <div className="mt-4">
                {showAssign && <div className="animate-fade-in"><AssignPractitioner patientId={patient.id} /></div>}
                {showBook && <div className="animate-fade-in"><BookAppointment patientId={patient.id} /></div>}
            </div>
        </div>
    );
}

/* ─── Assign Practitioner sub-component ─── */
function AssignPractitioner({ patientId }: { patientId: string }) {
    const [searchName, setSearchName] = useState('');
    const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
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
        onSuccess: () => alert('Practitioner assigned!'),
        onError: (err: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const error = err as any;
            alert(error.response?.data?.error || "Failed to assign practitioner");
        }
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
                    {practitioners.map((pr) => (
                        <li key={pr.id} className="p-2 flex items-center justify-between text-sm hover:bg-gray-50">
                            <span>{pr.name}</span>
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

interface Slot {
    id: string;
    start: string;
    end: string;
}

/* ─── Book Appointment sub-component ─── */
function BookAppointment({ patientId }: { patientId: string }) {
    const [practitionerId, setPractitionerId] = useState('');
    const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
    const [slots, setSlots] = useState<Slot[]>([]);
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
        },
        onError: (err: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const error = err as any;
            alert(error.response?.data?.error || "Failed to book appointment");
        }
    });

    // Load practitioners when component mounts
    // eslint-disable-next-line
    useEffect(() => { void loadPractitioners(); }, []);

    return (
        <div className="bg-teal-50 rounded p-3 space-y-2">
            <p className="text-sm font-medium text-teal-900">Select Practitioner:</p>
            <div className="flex flex-wrap gap-2">
                {practitioners.map((pr) => (
                    <button
                        key={pr.id}
                        onClick={() => loadSlots(pr.id)}
                        className={`rounded px-3 py-1 text-xs ${practitionerId === pr.id ? 'bg-teal-700 text-white' : 'bg-white border text-gray-700 hover:bg-teal-100'}`}
                    >
                        {pr.name}
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
                                {slots.map((s) => (
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
