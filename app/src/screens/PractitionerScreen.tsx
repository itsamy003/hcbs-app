import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Clock } from 'lucide-react-native';
import { format } from 'date-fns';

export default function PractitionerScreen() {
    const [activeTab, setActiveTab] = useState<'availability' | 'pto'>('availability');
    const [startOpen, setStartOpen] = useState(false);
    const [endOpen, setEndOpen] = useState(false);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(new Date().setHours(new Date().getHours() + 8)));
    const [duration, setDuration] = useState(30);

    const queryClient = useQueryClient();

    const { data: appointments } = useQuery({
        queryKey: ['appointments'],
        queryFn: async () => {
            const res = await api.get('/appointments');
            return res.data;
        }
    });

    const mutation = useMutation({
        mutationFn: async () => {
            return api.post('/practitioner/availability', {
                start: format(startDate, "yyyy-MM-dd'T'HH:mm:ss"),
                end: format(endDate, "yyyy-MM-dd'T'HH:mm:ss"),
                durationMinutes: duration,
                status: activeTab === 'pto' ? 'busy' : 'free'
            });
        },
        onSuccess: () => {
            Alert.alert("Success", "Availability Published!");
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
        },
        onError: (err: any) => {
            Alert.alert("Error", err.response?.data?.error || "Failed to publish");
        }
    });


    const groupAppointments = (items: any[]) => {
        if (!items || items.length === 0) return [];
        const sorted = [...items].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        const merged: any[] = [];
        let current = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            const next = sorted[i];
            const isContiguous = new Date(current.end).getTime() === new Date(next.start).getTime();

            if (current.status === 'available' && next.status === 'available' && isContiguous) {
                // Merge
                current = { ...current, end: next.end };
            } else {
                merged.push(current);
                current = next;
            }
        }
        merged.push(current);
        return merged;
    };

    const groupedAppointments = groupAppointments(appointments || []);

    const renderAppointment = ({ item }: { item: any }) => (
        <View style={[styles.card, item.status === 'pto' && styles.cardPto]}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                    {item.status === 'booked' ? (item.patientName || 'Patient') :
                        item.status === 'pto' ? 'Personal Time Off' : 'Available'}
                </Text>
                <View style={[
                    styles.badge,
                    item.status === 'booked' ? styles.badgeBooked :
                        item.status === 'pto' ? styles.badgePto : styles.badgeFree
                ]}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                </View>
            </View>
            <Text style={styles.cardTime}>
                {format(new Date(item.start), 'MMM d, h:mm a')} - {format(new Date(item.end), 'h:mm a')}
            </Text>
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Practitioner Workspace</Text>
                <Text style={styles.headerSubtitle}>Manage your schedule</Text>
            </View>

            {/* Set Availability Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Manage Schedule</Text>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'availability' && styles.activeTab]}
                        onPress={() => setActiveTab('availability')}
                    >
                        <Text style={[styles.tabText, activeTab === 'availability' && styles.activeTabText]}>General Availability</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'pto' && styles.activeTab]}
                        onPress={() => setActiveTab('pto')}
                    >
                        <Text style={[styles.tabText, activeTab === 'pto' && styles.activeTabText]}>PTO / Time Off</Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'availability' && (
                    <Text style={styles.helperText}>Set your working hours. The system will create slots automatically.</Text>
                )}
                {activeTab === 'pto' && (
                    <Text style={styles.helperText}>Block out time for personal time off.</Text>
                )}

                <TouchableOpacity style={styles.input} onPress={() => setStartOpen(true)}>
                    <Calendar color="#6b7280" size={20} />
                    <Text style={styles.inputText}>Start: {format(startDate, 'MMM d, h:mm a')}</Text>
                </TouchableOpacity>
                {startOpen && (
                    <DateTimePicker
                        value={startDate}
                        mode="datetime"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event: any, date?: Date) => {
                            setStartOpen(Platform.OS === 'ios');
                            if (date) setStartDate(date);
                        }}
                    />
                )}

                <TouchableOpacity style={styles.input} onPress={() => setEndOpen(true)}>
                    <Calendar color="#6b7280" size={20} />
                    <Text style={styles.inputText}>End: {format(endDate, 'MMM d, h:mm a')}</Text>
                </TouchableOpacity>
                {endOpen && (
                    <DateTimePicker
                        value={endDate}
                        mode="datetime"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event: any, date?: Date) => {
                            setEndOpen(Platform.OS === 'ios');
                            if (date) setEndDate(date);
                        }}
                    />
                )}

                {activeTab === 'availability' && (
                    <View style={styles.input}>
                        <Clock color="#6b7280" size={20} />
                        <Text style={styles.inputText}>Slot Duration: {duration} mins</Text>
                        {/* Simple toggle for demo, real app would use picker or input */}
                        <TouchableOpacity onPress={() => setDuration(duration === 30 ? 60 : 30)} style={{ marginLeft: 'auto' }}>
                            <Text style={{ color: '#4f46e5', fontWeight: 'bold' }}>Change</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.publishButton, activeTab === 'pto' && styles.ptoButton]}
                    onPress={() => mutation.mutate()}
                    disabled={mutation.isPending}
                >
                    <Text style={styles.publishButtonText}>
                        {mutation.isPending ? 'Processing...' : activeTab === 'availability' ? 'Publish Availability' : 'Schedule PTO'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Appointments List */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
                {groupedAppointments.length === 0 ? (
                    <Text style={styles.emptyText}>No appointments scheduled.</Text>
                ) : (
                    groupedAppointments.map((item: any, index: number) => (
                        <React.Fragment key={index}>
                            {renderAppointment({ item })}
                        </React.Fragment>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        padding: 24,
        backgroundColor: '#4f46e5',
        paddingTop: 60,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#e0e7ff',
        marginTop: 4,
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    input: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    inputText: {
        marginLeft: 10,
        fontSize: 16,
        color: '#374151',
    },
    publishButton: {
        backgroundColor: '#4f46e5',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    publishButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#4f46e5',
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    cardTime: {
        fontSize: 14,
        color: '#6b7280',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeBooked: {
        backgroundColor: '#e0e7ff',
    },
    badgeFree: {
        backgroundColor: '#d1fae5',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#374151',
        textTransform: 'uppercase',
    },
    emptyText: {
        textAlign: 'center',
        color: '#6b7280',
        marginTop: 20,
    },
    tabsContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        backgroundColor: '#e5e7eb',
        borderRadius: 8,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
    },
    activeTabText: {
        color: '#4f46e5',
        fontWeight: 'bold',
    },
    helperText: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 12,
        fontStyle: 'italic',
    },
    ptoButton: {
        backgroundColor: '#db2777', // Pink for PTO
    },
    cardPto: {
        borderLeftColor: '#db2777',
        backgroundColor: '#fff1f2',
    },
    badgePto: {
        backgroundColor: '#fce7f3',
    },
});
