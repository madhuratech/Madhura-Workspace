import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, TextInput, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, LogOut, LogIn, Calendar, Clock, X, Plus } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

export default function AttendanceLeaveScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');
  
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);

  const [leaveRecords, setLeaveRecords] = useState([]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveData, setLeaveData] = useState({ type: 'Sick', startDate: '', endDate: '', reason: '' });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Reset animations on tab change
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 12, bounciness: 4, useNativeDriver: true })
    ]).start();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const ws = wsRes.data[0];
        setWorkspace(ws);
        fetchAttendance(ws._id);
        fetchLeaves(ws._id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (wsId) => {
    try {
      const res = await axios.get(`/workspaces/${wsId}/attendance`);
      setAttendanceRecords(res.data);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todayRecord = res.data.find(r => r.date === todayStr && String(r.user?._id || r.user) === String(user._id));
      
      if (todayRecord) {
        setIsCheckedIn(true);
        if (todayRecord.checkOut) setIsCheckedOut(true);
      }
    } catch (error) {}
  };

  const fetchLeaves = async (wsId) => {
    try {
      const res = await axios.get(`/workspaces/${wsId}/leaves`);
      setLeaveRecords(res.data);
    } catch (error) {}
  };

  const handleCheckIn = async () => {
    try {
      await axios.post(`/workspaces/${workspace._id}/attendance/checkin`);
      setIsCheckedIn(true);
      fetchAttendance(workspace._id);
    } catch (error) {
      alert(error.response?.data?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      await axios.put(`/workspaces/${workspace._id}/attendance/checkout`);
      setIsCheckedOut(true);
      fetchAttendance(workspace._id);
    } catch (error) {
      alert(error.response?.data?.message || 'Check-out failed');
    }
  };

  const handleApplyLeave = async () => {
    if (!leaveData.startDate || !leaveData.endDate || !leaveData.reason) {
      alert('Please fill all fields');
      return;
    }
    try {
      await axios.post(`/workspaces/${workspace._id}/leaves`, leaveData);
      setIsLeaveModalOpen(false);
      setLeaveData({ type: 'Sick', startDate: '', endDate: '', reason: '' });
      fetchLeaves(workspace._id);
    } catch (error) {
      alert(error.response?.data?.message || 'Leave request failed');
    }
  };

  const myLeaves = leaveRecords.filter(l => String(l.user?._id || l.user) === String(user._id));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <TouchableOpacity onPress={() => setIsLeaveModalOpen(true)} style={styles.addBtn}>
          <Plus color="#111827" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'attendance' && styles.activeTab]} 
          onPress={() => setActiveTab('attendance')}
        >
          <Text style={[styles.tabText, activeTab === 'attendance' && styles.activeTabText]}>Log</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'leave' && styles.activeTab]} 
          onPress={() => setActiveTab('leave')}
        >
          <Text style={[styles.tabText, activeTab === 'leave' && styles.activeTabText]}>Leave</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            {activeTab === 'attendance' ? (
              <View>
                <View style={styles.actionCard}>
                  <View style={styles.actionTextWrapper}>
                    <Text style={styles.actionTitle}>Today's Status</Text>
                    <Text style={styles.actionSub}>Log your daily hours</Text>
                  </View>
                  
                  {isCheckedIn ? (
                    <View style={styles.checkedInRow}>
                      <View style={styles.statusBadge}>
                        <CheckCircle color="#166534" size={14} />
                        <Text style={styles.statusBadgeText}>IN</Text>
                      </View>
                      {!isCheckedOut ? (
                        <TouchableOpacity style={styles.checkOutBtn} onPress={handleCheckOut}>
                          <Text style={styles.checkOutText}>Check Out</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.statusBadge, { backgroundColor: '#F3F4F6', marginLeft: 8, borderColor: '#E5E7EB' }]}>
                          <CheckCircle color="#6B7280" size={14} />
                          <Text style={[styles.statusBadgeText, { color: '#4B5563' }]}>OUT</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.checkInBtn} onPress={handleCheckIn}>
                      <Text style={styles.checkInText}>Check In</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.sectionTitle}>Recent Logs</Text>
                {attendanceRecords.length === 0 ? (
                  <Text style={styles.emptyText}>No attendance records found.</Text>
                ) : (
                  attendanceRecords.map((record, index) => (
                    <View key={record._id || index} style={styles.recordCard}>
                      <View>
                        <Text style={styles.recordDate}>{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                        <Text style={styles.recordStatus}>{record.status}</Text>
                      </View>
                      <View style={styles.timesWrapper}>
                        <Text style={styles.timeText}>IN: {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</Text>
                        <Text style={styles.timeText}>OUT: {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>My Leave Requests</Text>
                {myLeaves.length === 0 ? (
                  <Text style={styles.emptyText}>No leave requests found.</Text>
                ) : (
                  myLeaves.map((leave, index) => (
                    <View key={leave._id || index} style={styles.recordCard}>
                      <View style={styles.leaveLeft}>
                        <Text style={styles.leaveType}>{leave.type}</Text>
                        <Text style={styles.leaveDates}>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</Text>
                        <Text style={styles.leaveReason} numberOfLines={2}>{leave.reason}</Text>
                      </View>
                      <View style={[
                        styles.statusChip, 
                        leave.status === 'Approved' ? styles.statusApproved : 
                        leave.status === 'Rejected' ? styles.statusRejected : styles.statusPending
                      ]}>
                        <Text style={[
                          styles.statusChipText,
                          leave.status === 'Approved' ? {color: '#166534'} : 
                          leave.status === 'Rejected' ? {color: '#991B1B'} : {color: '#854D0E'}
                        ]}>{leave.status}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      )}

      {/* Leave Modal */}
      <Modal visible={isLeaveModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply Leave</Text>
              <TouchableOpacity onPress={() => setIsLeaveModalOpen(false)}>
                <X color="#111827" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Leave Type</Text>
            <View style={styles.typeContainer}>
              {['Sick', 'Casual', 'Earned'].map(t => (
                <TouchableOpacity 
                  key={t}
                  style={[styles.typeBtn, leaveData.type === t && styles.typeBtnActive]}
                  onPress={() => setLeaveData({...leaveData, type: t})}
                >
                  <Text style={[styles.typeBtnText, leaveData.type === t && styles.typeBtnTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.dateRow}>
              <View style={{flex: 1, marginRight: 8}}>
                <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
                <TextInput 
                  style={styles.input} 
                  value={leaveData.startDate}
                  onChangeText={(t) => setLeaveData({...leaveData, startDate: t})}
                  placeholder="2024-01-01"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={{flex: 1, marginLeft: 8}}>
                <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
                <TextInput 
                  style={styles.input} 
                  value={leaveData.endDate}
                  onChangeText={(t) => setLeaveData({...leaveData, endDate: t})}
                  placeholder="2024-01-02"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <Text style={styles.label}>Reason</Text>
            <TextInput 
              style={[styles.input, { height: 80 }]} 
              value={leaveData.reason}
              onChangeText={(t) => setLeaveData({...leaveData, reason: t})}
              multiline
              placeholder="Why are you taking leave?"
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleApplyLeave}>
              <Text style={styles.submitBtnText}>Submit Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB'
  },
  backBtn: { padding: 4 },
  addBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827', letterSpacing: -0.5 },
  tabContainer: {
    flexDirection: 'row', paddingHorizontal: 24, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF'
  },
  tab: { marginRight: 24, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#2563EB' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#2563EB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingBottom: 140 },
  
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1
  },
  actionTextWrapper: { flex: 1 },
  actionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  actionSub: { fontSize: 13, color: '#6B7280' },
  checkInBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  checkInText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  checkedInRow: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 12, borderWidth: 1, borderColor: '#DCFCE7' },
  statusBadgeText: { color: '#166534', fontWeight: '600', fontSize: 12, marginLeft: 4 },
  checkOutBtn: { backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  checkOutText: { color: '#ffffff', fontWeight: '600', fontSize: 12 },
  
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  emptyText: { color: '#9CA3AF', fontSize: 14, fontStyle: 'italic' },
  
  recordCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB'
  },
  recordDate: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  recordStatus: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  timesWrapper: { alignItems: 'flex-end' },
  timeText: { fontSize: 13, color: '#6B7280', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 2 },

  leaveLeft: { flex: 1, paddingRight: 16 },
  leaveType: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  leaveDates: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  leaveReason: { fontSize: 13, color: '#9CA3AF' },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  statusChipText: { fontSize: 11, fontWeight: '600' },
  statusApproved: { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' },
  statusRejected: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  statusPending: { backgroundColor: '#FEFCE8', borderColor: '#FEF08A' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  label: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 8 },
  typeContainer: { flexDirection: 'row', marginBottom: 16 },
  typeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8, backgroundColor: '#FFFFFF' },
  typeBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  typeBtnText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
  typeBtnTextActive: { color: '#2563EB' },
  dateRow: { flexDirection: 'row', marginBottom: 16 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 14, color: '#111827', marginBottom: 16 },
  submitBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '600' }
});
