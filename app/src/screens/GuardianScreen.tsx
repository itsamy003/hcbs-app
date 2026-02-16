import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/api';
import { User, Link as LinkIcon, Calendar, Search, ChevronRight } from 'lucide-react-native';
import { format } from 'date-fns';

export default function GuardianScreen() {
    const [searchName, setSearchName] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showBookModal, setShowBookModal] = useState(false);

    // For Assign/Book Modals
    const [practitionerSearch, setPractitionerSearch] = useState('');
    const [practitioners, setPractitioners] = useState<any[]>([]);
    const [selectedPractitioner, setSelectedPractitioner] = useState<any>(null);
    const [slots, setSlots] = useState<any[]>([]);

    const queryClient = useQueryClient();

    const { data: myPatients, refetch: refetchPatients } = useQuery({
        queryKey: ['guardian-patients'],
        queryFn: async () => {
            const res = await api.get('/guardian/patients');
            return res.data;
        }
    });

    const searchPatient = async () => {
        if (!searchName.trim()) return;
        try {
            const res = await api.get('/guardian/search-patients', { params: { name: searchName } });
            setSearchResults(res.data);
        } catch { setSearchResults([]); }
    };

    const linkMutation = useMutation({
        mutationFn: async (patientId: string) => api.post('/guardian/link-patient', { patientId }),
        onSuccess: () => {
            Alert.alert("Success", "Patient linked!");
            setSearchResults([]);
            setSearchName('');
            refetchPatients();
        },
        onError: (err: any) => Alert.alert("Error", err.response?.data?.error || "Failed to link")
    });

    const searchPractitioners = async () => {
        try {
            const res = await api.get('/guardian/search-practitioners', { params: { name: practitionerSearch } });
            setPractitioners(res.data);
        } catch { setPractitioners([]); }
    };

    const assignMutation = useMutation({
        mutationFn: async (practitionerId: string) =>
            api.post('/guardian/assign-practitioner', { patientId: selectedPatientId, practitionerId }),
        onSuccess: () => {
            Alert.alert("Success", "Practitioner assigned!");
            setShowAssignModal(false);
        }
    });

    const loadSlots = async (practitionerId: string) => {
        try {
            const res = await api.get('/guardian/slots', { params: { practitionerId } });
            setSlots(res.data);
        } catch { setSlots([]); }
    };

    const bookMutation = useMutation({
        mutationFn: async (slotId: string) =>
            api.post('/guardian/book-appointment', { slotId, patientId: selectedPatientId, reason: 'Guardian booking' }),
        onSuccess: () => {
            Alert.alert("Success", "Appointment booked!");
            setShowBookModal(false);
            setSlots([]);
            setSelectedPractitioner(null);
        }
    });

    const renderPatientCard = (patient: any) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <User color="#4f46e5" size={24} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.patientName}>{patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family}</Text>
                    <Text style={styles.patientDob}>DOB: {patient.birthDate || 'N/A'}</Text>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#e0e7ff' }]}
                    onPress={() => { setSelectedPatientId(patient.id); setShowAssignModal(true); setPractitioners([]); }}
                >
                    <LinkIcon color="#4f46e5" size={16} />
                    <Text style={[styles.actionText, { color: '#4f46e5' }]}>Assign Practitioner</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#ccfbf1' }]}
                    onPress={() => { setSelectedPatientId(patient.id); setShowBookModal(true); setPractitioners([]); setSlots([]); }}
                >
                    <Calendar color="#0f766e" size={16} />
                    <Text style={[styles.actionText, { color: '#0f766e' }]}>Book Appointment</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Guardian Dashboard</Text>
                <Text style={styles.headerSubtitle}>Manage your dependents</Text>
            </View>

            {/* Search & Link Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Link New Patient</Text>
                <View style={styles.searchRow}>
                    <TextInput
                        style={styles.input}
                        placeholder="Search by name..."
                        value={searchName}
                        onChangeText={setSearchName}
                    />
                    <TouchableOpacity style={styles.searchBtn} onPress={searchPatient}>
                        <Search color="#fff" size={20} />
                    </TouchableOpacity>
                </View>

                {searchResults.map((p) => (
                    <View key={p.id} style={styles.resultItem}>
                        <Text style={styles.resultName}>{p.name?.[0]?.given?.join(' ')} {p.name?.[0]?.family}</Text>
                        <TouchableOpacity
                            style={styles.linkBtn}
                            onPress={() => linkMutation.mutate(p.id)}
                        >
                            <Text style={styles.linkBtnText}>Link</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            {/* Linked Patients List */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>My Recipients</Text>
                {myPatients?.map((p: any) => (
                    <React.Fragment key={p.id}>
                        {renderPatientCard(p)}
                    </React.Fragment>
                ))}
            </View>

            {/* Assign Practitioner Modal */}
            <Modal visible={showAssignModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Assign Practitioner</Text>
                        <View style={styles.searchRow}>
                            <TextInput
                                style={styles.input}
                                placeholder="Search practitioner..."
                                value={practitionerSearch}
                                onChangeText={setPractitionerSearch}
                                autoCorrect={false}
                            />
                            <TouchableOpacity style={styles.searchBtn} onPress={searchPractitioners}>
                                <Search color="#fff" size={20} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={practitioners}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.resultItem}>
                                    <Text style={styles.resultName}>{item.name}</Text>
                                    <TouchableOpacity
                                        style={styles.linkBtn}
                                        onPress={() => assignMutation.mutate(item.id)}
                                    >
                                        <Text style={styles.linkBtnText}>Assign</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAssignModal(false)}>
                            <Text style={styles.closeBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Book Appointment Modal */}
            <Modal visible={showBookModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Book Appointment</Text>
                        {!selectedPractitioner ? (
                            <>
                                <View style={styles.searchRow}>
                                    <TouchableOpacity style={[styles.searchBtn, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }]} onPress={searchPractitioners}>
                                        <Search color="#fff" size={20} />
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Load All Practitioners</Text>
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={practitioners}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.resultItem}
                                            onPress={() => { setSelectedPractitioner(item); loadSlots(item.id); }}
                                        >
                                            <Text style={styles.resultName}>{item.name}</Text>
                                            <ChevronRight color="#9ca3af" size={20} />
                                        </TouchableOpacity>
                                    )}
                                />
                            </>
                        ) : (
                            <>
                                <TouchableOpacity onPress={() => { setSelectedPractitioner(null); setSlots([]); }}>
                                    <Text style={{ color: '#4f46e5', marginBottom: 12, fontWeight: 'bold' }}>← Back to Practitioners</Text>
                                </TouchableOpacity>
                                <Text style={styles.subTitle}>Slots for {selectedPractitioner.name}</Text>
                                {slots.length === 0 ? <Text style={{ fontStyle: 'italic', color: '#6b7280' }}>No slots available</Text> : null}
                                <FlatList
                                    data={slots}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <View style={styles.resultItem}>
                                            <Text style={styles.resultName}>
                                                {format(new Date(item.start), 'MMM d, h:mm a')}
                                            </Text>
                                            <TouchableOpacity
                                                style={[styles.linkBtn, { backgroundColor: '#0f766e' }]}
                                                onPress={() => bookMutation.mutate(item.id)}
                                            >
                                                <Text style={styles.linkBtnText}>Book</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                />
                            </>
                        )}
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowBookModal(false)}>
                            <Text style={styles.closeBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { padding: 24, backgroundColor: '#7c3aed', paddingTop: 60 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { fontSize: 16, color: '#ddd6fe', marginTop: 4 },
    section: { padding: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
    searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    input: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
    searchBtn: { backgroundColor: '#7c3aed', padding: 12, borderRadius: 8, justifyContent: 'center' },
    resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8 },
    resultName: { fontSize: 16, color: '#374151', flex: 1, marginRight: 8 },
    linkBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    linkBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    patientName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    patientDob: { fontSize: 14, color: '#6b7280' },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 6 },
    actionText: { fontSize: 12, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '80%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
    subTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#374151' },
    closeBtn: { marginTop: 16, alignItems: 'center', padding: 12 },
    closeBtnText: { color: '#6b7280', fontSize: 16, fontWeight: 'bold' },
});
