import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, dateFnsLocalizer, Views, type View } from 'react-big-calendar';
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { Calendar as CalendarIcon, Clock, Users, FileText, ChevronRight } from 'lucide-react';

const locales = { 'en-US': enUS };

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
    // Combined datetime state — start and end both include date + time
    const [startDateTime, setStartDateTime] = useState<Date>(
        (() => { const d = new Date(); d.setHours(9, 0, 0, 0); d.setDate(d.getDate() + 1); return d; })()
    );
    const [endDateTime, setEndDateTime] = useState<Date>(
        (() => { const d = new Date(); d.setHours(17, 0, 0, 0); d.setDate(d.getDate() + 1); return d; })()
    );
    const [duration, setDuration] = useState(30);

    // Calendar controlled state
    const [calendarView, setCalendarView] = useState<View>(Views.WEEK as View);
    const [calendarDate, setCalendarDate] = useState<Date>(new Date());

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
        title: apt.status === 'booked'
            ? (apt.patientName || 'Patient')
            : 'Available',
        start: new Date(apt.start),
        end: new Date(apt.end || new Date(new Date(apt.start).getTime() + 30 * 60000)),
        resource: apt
    })) || [];

    // Custom Event component
    const EventComponent = ({ event }: { event: { title: string, resource: Appointment } }) => {
        const isBooked = event.resource.status === 'booked';
        return (
            <div className="flex flex-col h-full py-1">
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className="shrink-0 text-xs">{isBooked ? '🩺' : '✅'}</span>
                    <span className="truncate font-bold text-xs">{event.title}</span>
                </div>
                {isBooked && (
                    <div className="text-[10px] opacity-90 mt-1 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span className="truncate">Confirmed</span>
                    </div>
                )}
            </div>
        );
    };

    // Color-code events
    const eventPropGetter = useCallback((event: { resource: Appointment }) => {
        const isBooked = event.resource.status === 'booked';
        return {
            style: {
                backgroundColor: isBooked ? '#6366f1' : '#10b981', // indigo-500 for booked, emerald-500 for free
                borderRadius: '8px',
                border: 'none',
                color: '#fff',
                padding: '4px 10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }
        };
    }, []);

    // Post Availability
    const mutation = useMutation<unknown, Error, void>({
        mutationFn: async () => {
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
            const error = err as { response?: { data?: { error?: string } }; message?: string };
            alert("Failed to publish availability: " + (error.response?.data?.error || error.message));
        }
    });

    // Calendar navigation handlers
    const handleNavigate = useCallback((newDate: Date) => {
        setCalendarDate(newDate);
    }, []);

    const handleViewChange = useCallback((newView: View) => {
        setCalendarView(newView);
    }, []);

    // Compute slot preview
    const slotCount = startDateTime && endDateTime
        ? Math.max(0, Math.floor((endDateTime.getTime() - startDateTime.getTime()) / (duration * 60000)))
        : 0;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-8 py-8 shadow-2xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDE4YzAtOS45NC04LjA2LTE4LTE4LTE4cy0xOCA4LjA2LTE4IDE4IDguMDYgMTggMTggMTggMTgtOC4wNiAxOC0xOHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
                <div className="relative">
                    <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <CalendarIcon className="h-8 w-8 text-indigo-200" />
                        Practitioner Workspace
                    </h2>
                    <p className="mt-2 text-indigo-200 text-lg">Manage your schedule and patient care team</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Working Hours + Patients */}
                <section className="lg:col-span-1 space-y-6">
                    {/* Working Hours Card */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <Clock className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Set Availability</h3>
                                    <p className="text-xs text-indigo-200">Define when you're available for appointments</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Start DateTime */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Date & Time</label>
                                <DatePicker
                                    selected={startDateTime}
                                    onChange={(date: Date | null) => date && setStartDateTime(date)}
                                    showTimeSelect
                                    timeIntervals={15}
                                    timeCaption="Time"
                                    dateFormat="MMM d, yyyy  h:mm aa"
                                    minDate={new Date()}
                                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 text-sm transition-all"
                                />
                            </div>

                            {/* End DateTime */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Date & Time</label>
                                <DatePicker
                                    selected={endDateTime}
                                    onChange={(date: Date | null) => date && setEndDateTime(date)}
                                    showTimeSelect
                                    timeIntervals={15}
                                    timeCaption="Time"
                                    dateFormat="MMM d, yyyy  h:mm aa"
                                    minDate={startDateTime}
                                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 text-sm transition-all"
                                />
                            </div>

                            {/* Slot Duration */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Slot Duration</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <select
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm transition-all appearance-none cursor-pointer"
                                    >
                                        <option value={15}>15 Minutes</option>
                                        <option value={30}>30 Minutes</option>
                                        <option value={45}>45 Minutes</option>
                                        <option value={60}>1 Hour</option>
                                    </select>
                                </div>
                            </div>

                            {/* Slot Preview */}
                            {slotCount > 0 && (
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center gap-2">
                                    <ChevronRight className="h-4 w-4 text-indigo-500" />
                                    <span className="text-sm text-indigo-700 font-medium">
                                        This will create <strong>{slotCount}</strong> slot{slotCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            )}

                            {/* Publish Button */}
                            <button
                                onClick={() => mutation.mutate()}
                                disabled={mutation.isPending || slotCount === 0}
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                {mutation.isPending ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        Publishing...
                                    </span>
                                ) : `Publish ${slotCount} Slot${slotCount !== 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>

                    {/* Patient Directory */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <Users className="h-5 w-5 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Patient Directory</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <PatientManagement />
                        </div>
                    </div>
                </section>

                {/* Right Column: Weekly Schedule */}
                <section className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                        <CalendarIcon className="h-5 w-5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Your Schedule</h3>
                                </div>
                                <div className="flex gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" /> Available
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                                        <span className="w-2 h-2 rounded-full bg-indigo-300" /> Booked
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4" style={{ height: '650px' }}>
                            <Calendar
                                localizer={localizer}
                                events={events}
                                startAccessor="start"
                                endAccessor="end"
                                style={{ height: '100%' }}
                                view={calendarView}
                                date={calendarDate}
                                onView={handleViewChange}
                                onNavigate={handleNavigate}
                                views={[Views.WEEK, Views.DAY, Views.AGENDA]}
                                step={30}
                                timeslots={2}
                                min={new Date(1970, 0, 1, 7, 0)}
                                max={new Date(1970, 0, 1, 21, 0)}
                                eventPropGetter={eventPropGetter as (event: object) => React.HTMLAttributes<HTMLDivElement>}
                                components={{
                                    event: EventComponent
                                }}
                                popup
                                toolbar={true}
                            />
                        </div>
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

    const { data: patients, isLoading } = useQuery<Patient[]>({
        queryKey: ['practitioner-patients'],
        queryFn: async () => {
            const res = await api.get('/practitioner/patients');
            return res.data;
        }
    });

    // Fetch Appointments for Selected Patient
    const { data: patientAppointments, isLoading: isLoadingApts } = useQuery<Appointment[]>({
        queryKey: ['patient-appointments', selectedPatientId],
        queryFn: async () => {
            if (!selectedPatientId) return [];
            const res = await api.get('/appointments', { params: { patientId: selectedPatientId } });
            return res.data;
        },
        enabled: !!selectedPatientId
    });

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

    if (isLoading) return <p className="text-gray-500 text-sm animate-pulse">Loading patients...</p>;

    return (
        <div className="space-y-4">
            {patients?.length === 0 && (
                <div className="text-center py-6">
                    <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No patients assigned yet</p>
                </div>
            )}
            <ul className="divide-y max-h-60 overflow-y-auto border border-gray-100 rounded-xl">
                {patients?.map((p) => (
                    <li
                        key={p.id}
                        className={`p-3 cursor-pointer transition-all text-sm ${selectedPatientId === p.id
                            ? 'bg-emerald-50 border-l-4 border-emerald-500 font-semibold'
                            : 'hover:bg-gray-50'
                            }`}
                        onClick={() => setSelectedPatientId(p.id)}
                    >
                        <p className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs flex items-center justify-center font-bold">
                                {p.name?.[0]?.given?.[0]?.[0] || '?'}
                            </span>
                            {p.name?.[0]?.given?.join(' ')} {p.name?.[0]?.family}
                        </p>
                    </li>
                ))}
            </ul>

            {/* Booked Slots Section */}
            {selectedPatientId && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                    <h4 className="font-semibold text-sm flex items-center gap-2 text-indigo-700">
                        <Clock className="h-4 w-4" />
                        Booked Slots
                    </h4>
                    {isLoadingApts ? (
                        <p className="text-xs text-gray-500">Loading slots...</p>
                    ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {(patientAppointments || []).filter(a => a.status === 'booked').length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No slots booked with this patient</p>
                            ) : (
                                (patientAppointments || []).filter(a => a.status === 'booked').map((apt) => (
                                    <div key={apt.id} className="bg-indigo-50 p-2 rounded-lg border border-indigo-100 flex justify-between items-center">
                                        <div className="text-xs">
                                            <p className="font-semibold text-indigo-900">{format(new Date(apt.start), 'MMM d, p')}</p>
                                            <p className="text-indigo-600">{format(new Date(apt.start), 'eeee')}</p>
                                        </div>
                                        <div className="px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded text-[10px] font-bold uppercase tracking-wider">
                                            Confirmed
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {selectedPatientId && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4 text-emerald-600" />
                        Add Care Plan
                    </h4>
                    <input
                        className="w-full text-sm border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        value={carePlanTitle}
                        onChange={e => setCarePlanTitle(e.target.value)}
                        placeholder="Care plan title"
                    />
                    <textarea
                        className="w-full text-sm border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        value={carePlanDesc}
                        onChange={e => setCarePlanDesc(e.target.value)}
                        placeholder="Details..."
                        rows={2}
                    />
                    <button
                        onClick={() => createCarePlanMutation.mutate()}
                        disabled={createCarePlanMutation.isPending || !carePlanTitle}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm px-4 py-2.5 rounded-xl hover:from-emerald-600 hover:to-teal-700 w-full font-semibold transition-all disabled:opacity-50"
                    >
                        {createCarePlanMutation.isPending ? 'Creating...' : 'Create Care Plan'}
                    </button>
                </div>
            )}
        </div>
    );
}
