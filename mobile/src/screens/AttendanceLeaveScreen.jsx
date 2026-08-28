import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, TextInput, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, LogOut, LogIn, Calendar, Clock, X, Plus, AlertTriangle, Check, XCircle } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const PRIMARY = '#1b2b4c';
const ACCENT = '#ffca22';

export default function AttendanceLeaveScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'leave', 'early-leave'
  const [logView, setLogView] = useState('mine');
  const [currentUserRole, setCurrentUserRole] = useState('employee');
  
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);

  const [leaveRecords, setLeaveRecords] = useState([]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveData, setLeaveData] = useState({ type: 'Sick', startDate: '', endDate: '', reason: '' });

  const [earlyLeaves, setEarlyLeaves] = useState([]);
  const [isEarlyLeaveModalOpen, setIsEarlyLeaveModalOpen] = useState(false);
  const [earlyLeaveReason, setEarlyLeaveReason] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
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
        
        const detailRes = await axios.get(`/workspaces/${ws._id}`);
        const validMembers = (detailRes.data.members || []).filter(m => m.user);
        const me = validMembers.find(m => String(m.user._id || m.user) === String(user._id));
        if (me) setCurrentUserRole(me.role);

        fetchAttendance(ws._id);
        fetchLeaves(ws._id);
        fetchEarlyLeaves(ws._id);
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

  const fetchEarlyLeaves = async (wsId) => {
    try {
      const res = await axios.get(`/workspaces/${wsId}/early-leaves`);
      setEarlyLeaves(res.data);
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
    // Check time for early leave
    const now = new Date();
    const isBefore6PM = now.getHours() < 18;
    
    if (isBefore6PM) {
      const todayStr = now.toISOString().split('T')[0];
      const todayEarlyLeave = earlyLeaves.find(el => 
        String(el.user?._id || el.user) === String(user._id) && 
        new Date(el.date).toISOString().split('T')[0] === todayStr
      );

      if (!todayEarlyLeave || todayEarlyLeave.status !== 'approved') {
        // Trigger early leave modal
        setIsEarlyLeaveModalOpen(true);
        return;
      }
    }

    try {
      await axios.put(`/workspaces/${workspace._id}/attendance/checkout`);
      setIsCheckedOut(true);
      fetchAttendance(workspace._id);
    } catch (error) {
      alert(error.response?.data?.message || 'Check-out failed');
    }
  };

  const submitEarlyLeave = async () => {
    if (!earlyLeaveReason.trim()) {
      alert('Please provide a reason for leaving early.');
      return;
    }
    try {
      await axios.post(`/workspaces/${workspace._id}/early-leaves`, { reason: earlyLeaveReason });
      setIsEarlyLeaveModalOpen(false);
      setEarlyLeaveReason('');
      fetchEarlyLeaves(workspace._id);
      alert('Early leave request submitted. Waiting for approval.');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to request early leave');
    }
  };

  const updateEarlyLeaveStatus = async (id, status) => {
    try {
      await axios.put(`/workspaces/${workspace._id}/early-leaves/${id}`, { status });
      fetchEarlyLeaves(workspace._id);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status');
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

  const isManager = ['super_admin', 'hr', 'team_leader'].includes(currentUserRole);
  const myLeaves = leaveRecords.filter(l => String(l.user?._id || l.user) === String(user._id));
  const myEarlyLeaves = earlyLeaves.filter(l => String(l.user?._id || l.user) === String(user._id));
  const teamEarlyLeaves = earlyLeaves.filter(l => String(l.user?._id || l.user) !== String(user._id));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance & Leave</Text>
        {activeTab === 'leave' ? (
          <TouchableOpacity onPress={() => setIsLeaveModalOpen(true)} style={styles.addBtn}>
            <Plus color={PRIMARY} size={24} />
          </TouchableOpacity>
        ) : <View style={{width: 24}} />}
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'attendance' && { borderBottomColor: PRIMARY }]} onPress={() => setActiveTab('attendance')}>
          <Text style={[styles.tabText, { color: '#64748B' }, activeTab === 'attendance' && { color: PRIMARY }]}>Log</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'leave' && { borderBottomColor: PRIMARY }]} onPress={() => setActiveTab('leave')}>
          <Text style={[styles.tabText, { color: '#64748B' }, activeTab === 'leave' && { color: PRIMARY }]}>Leave</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'early-leave' && { borderBottomColor: PRIMARY }]} onPress={() => setActiveTab('early-leave')}>
          <Text style={[styles.tabText, { color: '#64748B' }, activeTab === 'early-leave' && { color: PRIMARY }]}>Early Leave</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            {activeTab === 'attendance' && (
              <View>
                <DigitalClock />
                <View style={styles.actionCard}>
                  <View style={styles.actionTextWrapper}>
                    <Text style={styles.actionTitle}>Timecard</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                      <Calendar color="#64748B" size={14} style={{marginRight: 6}} />
                      <Text style={styles.actionSub}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                    </View>
                  </View>
                  
                  {isCheckedIn ? (
                    <View style={styles.checkedInRow}>
                      <View style={[styles.statusBadge, { backgroundColor: '#10B98115', borderColor: '#10B98140' }]}>
                        <CheckCircle color="#10B981" size={14} />
                        <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>IN</Text>
                      </View>
                      {!isCheckedOut ? (
                        <TouchableOpacity style={[styles.checkOutBtn, { backgroundColor: '#F59E0B' }]} onPress={handleCheckOut}>
                          <LogOut color="#ffffff" size={14} style={{marginRight: 6}} />
                          <Text style={styles.checkOutText}>Punch Out</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.statusBadge, { backgroundColor: '#F1F5F9', marginLeft: 8, borderColor: '#E2E8F0' }]}>
                          <CheckCircle color="#94A3B8" size={14} />
                          <Text style={[styles.statusBadgeText, { color: '#64748B' }]}>OUT</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity style={[styles.checkInBtn, { backgroundColor: PRIMARY }]} onPress={handleCheckIn}>
                      <LogIn color="#ffffff" size={14} style={{marginRight: 6}} />
                      <Text style={styles.checkInText}>Punch In</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {isManager && (
                  <View style={styles.logToggleContainer}>
                    <TouchableOpacity style={[styles.logToggleBtn, logView === 'mine' && styles.logToggleBtnActive]} onPress={() => setLogView('mine')}>
                      <Text style={[styles.logToggleText, { color: '#64748B' }, logView === 'mine' && { color: '#111827' }]}>My Logs</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.logToggleBtn, logView === 'team' && styles.logToggleBtnActive]} onPress={() => setLogView('team')}>
                      <Text style={[styles.logToggleText, { color: '#64748B' }, logView === 'team' && { color: '#111827' }]}>Team Logs</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.sectionTitle}>{logView === 'mine' ? 'My Recent Logs' : 'Team Recent Logs'}</Text>
                {attendanceRecords.filter(r => logView === 'mine' ? String(r.user?._id || r.user) === String(user._id) : true).length === 0 ? (
                  <Text style={styles.emptyText}>No attendance records found.</Text>
                ) : (
                  attendanceRecords.filter(r => logView === 'mine' ? String(r.user?._id || r.user) === String(user._id) : true).map((record, index) => (
                    <View key={record._id || index} style={styles.recordCard}>
                      <View style={{ flex: 1 }}>
                        {logView === 'team' && <Text style={styles.recordName}>{record.user?.name}</Text>}
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
            )}

            {activeTab === 'leave' && (
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
                      <View style={[styles.statusChip, { 
                        backgroundColor: leave.status === 'Approved' ? '#10B98120' : leave.status === 'Rejected' ? '#EF444420' : '#F59E0B20',
                        borderColor: leave.status === 'Approved' ? '#10B98140' : leave.status === 'Rejected' ? '#EF444440' : '#F59E0B40',
                      }]}>
                        <Text style={[styles.statusChipText, { 
                          color: leave.status === 'Approved' ? '#10B981' : leave.status === 'Rejected' ? '#EF4444' : '#F59E0B'
                        }]}>{leave.status}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {activeTab === 'early-leave' && (
              <View>
                {isManager && (
                  <View style={styles.logToggleContainer}>
                    <TouchableOpacity style={[styles.logToggleBtn, logView === 'mine' && styles.logToggleBtnActive]} onPress={() => setLogView('mine')}>
                      <Text style={[styles.logToggleText, { color: '#64748B' }, logView === 'mine' && { color: '#111827' }]}>My Requests</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.logToggleBtn, logView === 'team' && styles.logToggleBtnActive]} onPress={() => setLogView('team')}>
                      <Text style={[styles.logToggleText, { color: '#64748B' }, logView === 'team' && { color: '#111827' }]}>Team Approvals</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.sectionTitle}>
                  {logView === 'mine' ? 'My Early Leaves' : 'Team Early Leave Requests'}
                </Text>
                
                {logView === 'mine' ? (
                  myEarlyLeaves.length === 0 ? <Text style={styles.emptyText}>No early leave requests.</Text> :
                  myEarlyLeaves.map(el => (
                    <View key={el._id} style={styles.recordCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.leaveDates, { color: '#111827' }]}>{new Date(el.date).toLocaleDateString()}</Text>
                        <Text style={styles.leaveReason} numberOfLines={2}>{el.reason}</Text>
                      </View>
                      <View style={[styles.statusChip, { 
                        backgroundColor: el.status === 'approved' ? '#10B98120' : el.status === 'rejected' ? '#EF444420' : '#F59E0B20',
                        borderColor: el.status === 'approved' ? '#10B98140' : el.status === 'rejected' ? '#EF444440' : '#F59E0B40',
                      }]}>
                        <Text style={[styles.statusChipText, { 
                          color: el.status === 'approved' ? '#10B981' : el.status === 'rejected' ? '#EF4444' : '#F59E0B'
                        }]}>{el.status}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  teamEarlyLeaves.length === 0 ? <Text style={styles.emptyText}>No team early leave requests.</Text> :
                  teamEarlyLeaves.map(el => (
                    <View key={el._id} style={[styles.recordCard, { flexDirection: 'column', alignItems: 'stretch' }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={styles.recordName}>{el.user?.name}</Text>
                        <Text style={styles.leaveDates}>{new Date(el.date).toLocaleDateString()}</Text>
                      </View>
                      <Text style={[styles.leaveReason, { marginBottom: 12 }]}>{el.reason}</Text>
                      
                      {el.status === 'pending_tl' || el.status === 'pending_hr' ? (
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF444420' }]} onPress={() => updateEarlyLeaveStatus(el._id, 'rejected')}>
                            <XCircle size={16} color="#EF4444" style={{ marginRight: 4 }} />
                            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Reject</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B98120' }]} onPress={() => updateEarlyLeaveStatus(el._id, currentUserRole === 'team_leader' ? 'pending_hr' : 'approved')}>
                            <Check size={16} color="#10B981" style={{ marginRight: 4 }} />
                            <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Approve</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Text style={{ fontSize: 12, color: el.status === 'approved' ? '#10B981' : '#EF4444', fontWeight: '700', textAlign: 'right' }}>
                          {el.status.toUpperCase()}
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

          </Animated.View>
        </ScrollView>
      )}

      {/* Normal Leave Modal */}
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
                  style={[styles.typeBtn, leaveData.type === t && { borderColor: PRIMARY, backgroundColor: PRIMARY + '15' }]}
                  onPress={() => setLeaveData({...leaveData, type: t})}
                >
                  <Text style={[styles.typeBtnText, leaveData.type === t && { color: PRIMARY }]}>{t}</Text>
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
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={{flex: 1, marginLeft: 8}}>
                <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
                <TextInput 
                  style={styles.input} 
                  value={leaveData.endDate}
                  onChangeText={(t) => setLeaveData({...leaveData, endDate: t})}
                  placeholder="2024-01-02"
                  placeholderTextColor="#94A3B8"
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
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleApplyLeave}>
              <Text style={styles.submitBtnText}>Submit Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Early Leave Modal */}
      <Modal visible={isEarlyLeaveModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Early Checkout</Text>
              <TouchableOpacity onPress={() => setIsEarlyLeaveModalOpen(false)}>
                <X color="#111827" size={24} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B20', padding: 12, borderRadius: 8, marginBottom: 20 }}>
              <AlertTriangle color="#F59E0B" size={20} style={{ marginRight: 12 }} />
              <Text style={{ flex: 1, fontSize: 13, color: '#64748B', lineHeight: 18 }}>
                It's before 6:00 PM. Checking out now requires an Early Leave request.
              </Text>
            </View>

            <Text style={styles.label}>Reason for Early Leave</Text>
            <TextInput 
              style={[styles.input, { height: 100 }]} 
              value={earlyLeaveReason}
              onChangeText={setEarlyLeaveReason}
              multiline
              placeholder="Please explain why you are leaving early..."
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={submitEarlyLeave}>
              <Text style={styles.submitBtnText}>Submit Early Leave Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <View style={styles.clockContainer}>
      <Text style={styles.clockTime}>
        {time.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </Text>
      <Text style={styles.clockLabel}>CURRENT TIME</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0'
  },
  backBtn: { padding: 4 },
  addBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  tabContainer: {
    flexDirection: 'row', paddingHorizontal: 24, marginBottom: 16, borderBottomWidth: 1,
    backgroundColor: '#ffffff', borderBottomColor: '#E2E8F0'
  },
  tab: { marginRight: 24, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingBottom: 140 },
  
  actionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#E2E8F0'
  },
  actionTextWrapper: { flex: 1 },
  actionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 2, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', color: '#111827' },
  actionSub: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  checkInBtn: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12, flexDirection: 'row', alignItems: 'center',
  },
  checkInText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  checkedInRow: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 12, borderWidth: 1 },
  statusBadgeText: { fontWeight: '700', fontSize: 12, marginLeft: 4 },
  checkOutBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  checkOutText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  
  logToggleContainer: { flexDirection: 'row', padding: 4, borderRadius: 12, marginBottom: 24, backgroundColor: '#F1F5F9' },
  logToggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  logToggleBtnActive: { shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, backgroundColor: '#ffffff' },
  logToggleText: { fontSize: 13, fontWeight: '600' },
  
  clockContainer: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginBottom: 24, alignSelf: 'center', width: '100%', backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
  clockTime: { fontSize: 28, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 1, color: '#111827' },
  clockLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 4, color: '#64748B' },
  
  recordName: { fontSize: 12, fontWeight: '700', marginBottom: 2, color: '#111827', fontSize: 14 },
  
  sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, color: '#64748B' },
  emptyText: { fontSize: 14, fontStyle: 'italic', color: '#64748B' },
  
  recordCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0'
  },
  recordDate: { fontSize: 15, fontWeight: '600', marginBottom: 4, color: '#111827' },
  recordStatus: { fontSize: 12, fontWeight: '600', color: '#10B981' },
  timesWrapper: { alignItems: 'flex-end' },
  timeText: { fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 2, color: '#64748B' },

  leaveLeft: { flex: 1, paddingRight: 16 },
  leaveType: { fontSize: 15, fontWeight: '600', marginBottom: 4, color: '#111827' },
  leaveDates: { fontSize: 13, marginBottom: 4, color: '#64748B' },
  leaveReason: { fontSize: 13, color: '#64748B' },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusChipText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, backgroundColor: '#ffffff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, color: '#64748B' },
  typeContainer: { flexDirection: 'row', marginBottom: 16 },
  typeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginRight: 8, borderColor: '#E2E8F0', backgroundColor: '#F1F5F9' },
  typeBtnText: { fontWeight: '600', fontSize: 13, color: '#64748B' },
  dateRow: { flexDirection: 'row', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 16, backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', color: '#111827' },
  submitBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, backgroundColor: PRIMARY },
  submitBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '600' }
});
