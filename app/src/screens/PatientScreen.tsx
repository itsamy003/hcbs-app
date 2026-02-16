import React from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../api/api';
import { format } from 'date-fns';
import { User, ClipboardList, Stethoscope } from 'lucide-react-native';

export default function PatientScreen() {
    const { data: careTeam, refetch: refetchTeam } = useQuery({
        queryKey: ['careTeam'],
        queryFn: async () => {
            const res = await api.get('/patient/care-team');
            return res.data;
        }
    });

    const { data: appointments, refetch: refetchApts } = useQuery({
        queryKey: ['appointments'],
        queryFn: async () => {
            const res = await api.get('/appointments');
            return res.data;
        }
    });

    const onRefresh = React.useCallback(() => {
        refetchTeam();
        refetchApts();
    }, []);

    const renderCareTeamMember = (member: any) => (
        <View style={styles.memberCard}>
            <View style={styles.avatar}>
                <User color="#fff" size={24} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{member.member?.display || 'Unknown'}</Text>
                <Text style={styles.memberRole}>
                    {member.role?.[0]?.coding?.[0]?.display || 'Member'}
                </Text>
            </View>
        </View>
    );

    const renderAppointment = (apt: any) => (
        <View style={styles.aptCard}>
            <View style={styles.aptHeader}>
                <Text style={styles.aptDate}>{format(new Date(apt.start), 'MMM d, h:mm a')}</Text>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{apt.status}</Text>
                </View>
            </View>
            <Text style={styles.aptPractitioner}>Dr. {apt.practitionerName}</Text>
            <Text style={styles.aptReason}>{apt.reasonCode?.[0]?.text || 'Checkup'}</Text>
        </View>
    );

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <Text style={styles.title}>My Health</Text>
                <Text style={styles.subtitle}>Track your care journey</Text>
            </View>

            {/* Care Team Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>My Care Team</Text>
                {careTeam && careTeam.length > 0 ? (
                    careTeam.map((ct: any) => (
                        <React.Fragment key={ct.id}>
                            {ct.participant?.map((p: any, idx: number) => (
                                <View key={idx} style={{ marginBottom: 8 }}>{renderCareTeamMember(p)}</View>
                            ))}
                        </React.Fragment>
                    ))
                ) : (
                    <Text style={styles.emptyText}>No care team assigned yet.</Text>
                )}
            </View>

            {/* Appointments Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
                {appointments && appointments.length > 0 ? (
                    appointments.map((apt: any) => (
                        <React.Fragment key={apt.id}>
                            {renderAppointment(apt)}
                        </React.Fragment>
                    ))
                ) : (
                    <Text style={styles.emptyText}>No upcoming appointments.</Text>
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
        backgroundColor: '#059669', // emerald-600
        paddingTop: 60,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 16,
        color: '#a7f3d0',
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
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#059669',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    memberRole: {
        fontSize: 14,
        color: '#6b7280',
    },
    aptCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#059669',
        elevation: 1,
    },
    aptHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    aptDate: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    statusBadge: {
        backgroundColor: '#d1fae5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        color: '#065f46',
        fontWeight: 'bold',
    },
    aptPractitioner: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    aptReason: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    emptyText: {
        color: '#9ca3af',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
    },
});
