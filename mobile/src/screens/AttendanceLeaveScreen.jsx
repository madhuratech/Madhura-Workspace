import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, TextInput, Modal, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
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
  const [todayRecord, setTodayRecord] = useState(null);

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
      const foundToday = res.data.find(r => r.date === todayStr && String(r.user?._id || r.user) === String(user._id));
      setTodayRecord(foundToday || null);
      if (foundToday) {
        setIsCheckedIn(true);
        if (foundToday.checkOut) {
          setIsCheckedOut(true);
        } else {
          const now = new Date();
          const [endH, endM] = (user?.shiftEndTime || '18:00').split(':').map(Number);
          const currentMins = now.getHours() * 60 + now.getMinutes();
          const shiftEndMins = (endH || 18) * 60 + (endM || 0);
          if (currentMins >= shiftEndMins && (!foundToday.overtimeMinutes || foundToday.overtimeMinutes === 0)) {
            setIsCheckedOut(true);
          } else {
            setIsCheckedOut(false);
          }
        }
      } else {
        setIsCheckedIn(false);
        setIsCheckedOut(false);
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
    // Check time for early leave against employee's specific shiftEndTime
    const now = new Date();
    const userShiftEnd = user?.shiftEndTime || '18:00';
    const [endHStr, endMStr] = userShiftEnd.split(':');
    const endH = parseInt(endHStr, 10) || 18;
    const endM = parseInt(endMStr, 10) || 0;

    const currentTotalMin = now.getHours() * 60 + now.getMinutes();
    const shiftEndTotalMin = endH * 60 + endM;
    const isBeforeShiftEnd = currentTotalMin < shiftEndTotalMin;
    
    if (isBeforeShiftEnd) {
      const todayStr = now.toISOString().split('T')[0];
      const todayEarlyLeave = earlyLeaves.find(el => 
        String(el.user?._id || el.user || el.employee?._id || el.employee) === String(user._id) && 
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
      const now = new Date();
      const requestedLeaveTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      await axios.post(`/workspaces/${workspace._id}/early-leaves`, { 
        reason: earlyLeaveReason.trim(),
        requestedLeaveTime
      });
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
                  <View style={styles.actionHeader}>
                    <View style={styles.actionTextWrapper}>
                      <Text style={styles.actionTitle}>Timecard</Text>
                      <View style={styles.dateRowItem}>
                        <Calendar color="#64748B" size={14} style={{ marginRight: 6 }} />
                        <Text style={styles.actionSub}>
                          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#6366F1', marginTop: 3 }}>
                        Shift: {user?.shiftStartTime || '09:40'} - {user?.shiftEndTime || '18:00'}
                      </Text>
                    </View>

                    {isCheckedIn ? (
                      <View style={[styles.statusBadge, { 
                        backgroundColor: isCheckedOut ? '#F1F5F9' : '#10B98115', 
                        borderColor: isCheckedOut ? '#E2E8F0' : '#10B98140' 
                      }]}>
                        <CheckCircle color={isCheckedOut ? '#64748B' : '#10B981'} size={14} />
                        <Text style={[styles.statusBadgeText, { color: isCheckedOut ? '#64748B' : '#10B981' }]}>
                          {isCheckedOut ? 'OUT' : 'IN'}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                        <Clock color="#64748B" size={14} />
                        <Text style={[styles.statusBadgeText, { color: '#64748B' }]}>NOT IN</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.actionBtnContainer}>
                    {!isCheckedIn ? (
                      <TouchableOpacity 
                        style={[styles.punchActionBtn, { backgroundColor: PRIMARY }]} 
                        onPress={handleCheckIn}
                        activeOpacity={0.8}
                      >
                        <LogIn color="#ffffff" size={16} style={{ marginRight: 8 }} />
                        <Text style={styles.punchActionBtnText}>Punch In</Text>
                      </TouchableOpacity>
                    ) : !isCheckedOut ? (
                      <TouchableOpacity 
                        style={[styles.punchActionBtn, { backgroundColor: '#D97706' }]} 
                        onPress={handleCheckOut}
                        activeOpacity={0.8}
                      >
                        <LogOut color="#ffffff" size={16} style={{ marginRight: 8 }} />
                        <Text style={styles.punchActionBtnText}>Punch Out</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.completedBadge}>
                        <CheckCircle color="#10B981" size={16} style={{ marginRight: 6 }} />
                        <Text style={styles.completedText}>
                          {todayRecord?.overtimeMinutes > 0 
                            ? `Shift & OT Done (+${todayRecord.overtimeHours || +(todayRecord.overtimeMinutes / 60).toFixed(1)}h)` 
                            : 'Shift Completed (Auto Shift End)'}
                        </Text>
                      </View>
                    )}
                  </View>
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
                        {record.overtimeMinutes > 0 && (
                          <Text style={{ fontSize: 11, color: '#D97706', fontWeight: 'bold', marginTop: 2 }}>
                            +{record.overtimeHours || +(record.overtimeMinutes / 60).toFixed(1)}h OT
                          </Text>
                        )}
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
      <Modal visible={isLeaveModalOpen} transparent animationType="fade" onRequestClose={() => setIsLeaveModalOpen(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlayTouch}>
              <View style={styles.modalContent}>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
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
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Early Leave Modal */}
      <Modal visible={isEarlyLeaveModalOpen} transparent animationType="fade" onRequestClose={() => setIsEarlyLeaveModalOpen(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlayTouch}>
              <View style={styles.modalContent}>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
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
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
    backgroundColor: '#ffffff',
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  actionTextWrapper: { flex: 1, paddingRight: 12 },
  actionTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    marginBottom: 4, 
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', 
    color: '#111827' 
  },
  dateRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  actionSub: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 8, 
    borderWidth: 1 
  },
  statusBadgeText: { fontWeight: '700', fontSize: 12, marginLeft: 4 },
  
  actionBtnContainer: {
    width: '100%',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  punchActionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  punchActionBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#10B98115',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  completedText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 14,
  },
  
  logToggleContainer: { flexDirection: 'row', padding: 4, borderRadius: 12, marginBottom: 24, backgroundColor: '#F1F5F9' },
  logToggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  logToggleBtnActive: { shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, backgroundColor: '#ffffff' },
  logToggleText: { fontSize: 13, fontWeight: '600' },
  
  clockContainer: { 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderRadius: 16, 
    borderWidth: 1, 
    alignItems: 'center', 
    marginBottom: 20, 
    alignSelf: 'center', 
    width: '100%', 
    backgroundColor: '#ffffff', 
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  clockTime: { 
    fontSize: 32, 
    fontWeight: '800', 
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', 
    letterSpacing: 2, 
    color: '#1b2b4c' 
  },
  clockLabel: { 
    fontSize: 11, 
    fontWeight: '700', 
    letterSpacing: 2, 
    marginTop: 6, 
    color: '#64748B' 
  },
  
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.5)' },
  modalOverlayTouch: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, backgroundColor: '#ffffff', maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
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
