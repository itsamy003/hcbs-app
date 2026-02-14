import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface Appointment {
    id: string;
    start: string;
    end?: string;
    status: 'booked' | 'available';
    patientName?: string;
}

export default function PractitionerDashboard() {
    // Availability State
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [startTime, setStartTime] = useState<Date | null>(new Date(new Date().setHours(9, 0)));
    const [endTime, setEndTime] = useState<Date | null>(new Date(new Date().setHours(17, 0)));
    const [duration, setDuration] = useState(30);

    // Fetch Appointments
    const { data: appointments, refetch: refetchAppointments } = useQuery<Appointment[]>({
        queryKey: ['appointments'],
        queryFn: async () => {
            const res = await api.get('/appointments');
            return res.data;
        }
    });

    // Map appointments to BigCalendar format
    const events = appointments?.map(apt => ({
        title: `${apt.status === 'booked' ? 'Booked' : 'Available'} - ${apt.patientName || 'Open'}`,
        start: new Date(apt.start),
        end: new Date(apt.end || new Date(new Date(apt.start).getTime() + 30 * 60000)), // Default 30m if no end
        resource: apt
    })) || [];

    // Post Availability
    const mutation = useMutation({
        mutationFn: async () => {
            if (!selectedDate || !startTime || !endTime) return;

            // Construct start/end Date strings
            const startDateTime = new Date(selectedDate);
            startDateTime.setHours(startTime.getHours(), startTime.getMinutes());

            const endDateTime = new Date(selectedDate);
            endDateTime.setHours(endTime.getHours(), endTime.getMinutes());

            return api.post('/practitioner/availability', {
                start: format(startDateTime, "yyyy-MM-dd'T'HH:mm:ss"),
                end: format(endDateTime, "yyyy-MM-dd'T'HH:mm:ss"),
                durationMinutes: duration
            });
        },
        onSuccess: () => {
            alert("Availability Successfully Published!");
            refetchAppointments();
        },
        onError: (err: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const error = err as any;
            alert("Failed to publish availability: " + (error.response?.data?.error || error.message));
        }
    });

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Practitioner Workspace</h2>
                    <p className="mt-2 text-gray-500">Manage your schedule and patient care team</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Define Availability (Left Column) */}
                <section className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-6">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <CalendarIcon className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Working Hours</h3>
                                <p className="text-sm text-gray-500">Set your daily slots</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Date</label>
                                <DatePicker
                                    selected={selectedDate}
                                    onChange={(date) => setSelectedDate(date)}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                                    dateFormat="MMMM d, yyyy"
                                    minDate={new Date()}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
                                    <DatePicker
                                        selected={startTime}
                                        onChange={(date) => setStartTime(date)}
                                        showTimeSelect
                                        showTimeSelectOnly
                                        timeIntervals={30}
                                        timeCaption="Time"
                                        dateFormat="h:mm aa"
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
                                    <DatePicker
                                        selected={endTime}
                                        onChange={(date) => setEndTime(date)}
                                        showTimeSelect
                                        showTimeSelectOnly
                                        timeIntervals={30}
                                        timeCaption="Time"
                                        dateFormat="h:mm aa"
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Slot Duration</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <select
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value={15}>15 Minutes</option>
                                        <option value={30}>30 Minutes</option>
                                        <option value={60}>1 Hour</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={() => mutation.mutate()}
                                disabled={mutation.isPending}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
                            >
                                {mutation.isPending ? 'Publishing...' : 'Publish Availability'}
                            </button>
                        </div>
                    </div>

                    {/* Patient Section below Availability on small screens, or kept here */}
                    <div className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                        <h3 className="mb-4 text-xl font-bold text-gray-900">Patient Directory</h3>
                        <PatientManagement />
                    </div>
                </section>

                {/* 2. Calendar View (Right Column, spans 2) */}
                <section className="lg:col-span-2 min-h-[600px] bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Your Weekly Schedule</h3>
                    <div className="h-[600px]">
                        <Calendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%' }}
                            defaultView={Views.WEEK}
                            views={['week', 'day', 'agenda']}
                            step={30}
                            timeslots={2}
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}

interface Patient {
    id: string;
    name: {
        given: string[];
        family: string;
    }[];
}

function PatientManagement() {
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [carePlanTitle, setCarePlanTitle] = useState('');
    const [carePlanDesc, setCarePlanDesc] = useState('');

    // Fetch Patients
    const { data: patients, isLoading } = useQuery<Patient[]>({
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

    if (isLoading) return <p className="text-gray-500 text-sm">Loading patients...</p>;

    return (
        <div className="space-y-4">
            {/* Simple List for Sidebar */}
            <div>
                {patients?.length === 0 && <p className="text-gray-500 text-sm">No patients assigned.</p>}
                <ul className="divide-y max-h-60 overflow-y-auto border rounded-lg">
                    {patients?.map((p) => (
                        <li
                            key={p.id}
                            className={`p-3 cursor-pointer hover:bg-gray-50 text-sm ${selectedPatientId === p.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                            onClick={() => setSelectedPatientId(p.id)}
                        >
                            <p className="font-medium">{p.name?.[0]?.given?.join(' ')} {p.name?.[0]?.family}</p>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Actions for Selected Patient */}
            {selectedPatientId && (
                <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-semibold text-sm">Add Care Plan</h4>
                    <input className="w-full text-sm border rounded p-2" value={carePlanTitle} onChange={e => setCarePlanTitle(e.target.value)} placeholder="Title" />
                    <textarea className="w-full text-sm border rounded p-2" value={carePlanDesc} onChange={e => setCarePlanDesc(e.target.value)} placeholder="Details..." rows={2} />
                    <button
                        onClick={() => createCarePlanMutation.mutate()}
                        disabled={createCarePlanMutation.isPending}
                        className="bg-green-600 text-white text-sm px-4 py-2 rounded hover:bg-green-700 w-full"
                    >
                        {createCarePlanMutation.isPending ? 'Creating...' : 'Create Care Plan'}
                    </button>
                </div>
            )}
        </div>
    );
}
