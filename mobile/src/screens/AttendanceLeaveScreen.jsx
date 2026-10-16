import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  TouchableOpacity, 
  ActivityIndicator, 
  Animated, 
  TextInput, 
  Modal, 
  Platform, 
  KeyboardAvoidingView, 
  TouchableWithoutFeedback, 
  Keyboard,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  CheckCircle, 
  LogOut, 
  LogIn, 
  Calendar, 
  Clock, 
  X, 
  Plus, 
  AlertTriangle, 
  Check, 
  XCircle, 
  Trash2, 
  Edit2, 
  Edit3, 
  User, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus
} from 'lucide-react-native';
import { AuthContext, getISTDateString } from '../context/AuthContext';
import { loadWorkspaceCache } from '../utils/api';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';

const PRIMARY = '#1b2b4c';
const ACCENT = '#ffca22';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Interactive Calendar Picker Component for mobile (No manual date typing needed)
function InlineCalendarPicker({ 
  selectedDate, 
  onSelectDate, 
  accentColor = '#D97706',
  label = 'Date' 
}) {
  const initialDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  const [viewDate, setViewDate] = useState(
    isNaN(initialDate.getTime()) ? new Date() : new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
  }, [selectedDate]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const shortDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const formatYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatYMD(new Date());

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = formatYMD(yesterdayDate);

  const twoDaysAgoDate = new Date();
  twoDaysAgoDate.setDate(twoDaysAgoDate.getDate() - 2);
  const twoDaysAgoStr = formatYMD(twoDaysAgoDate);

  const displaySelectedFormatted = () => {
    if (!selectedDate) return 'Select Date';
    try {
      const d = new Date(selectedDate + 'T00:00:00');
      if (isNaN(d.getTime())) return selectedDate;
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return selectedDate;
    }
  };

  const handleDayPress = (dayNum) => {
    const pad = (n) => String(n).padStart(2, '0');
    const newDateStr = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
    onSelectDate(newDateStr);
    setIsExpanded(false);
  };

  const cells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({ key: `blank-${i}`, day: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const pad = (n) => String(n).padStart(2, '0');
    const cellDateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
    cells.push({
      key: `day-${d}`,
      day: d,
      dateStr: cellDateStr,
      isSelected: cellDateStr === selectedDate,
      isToday: cellDateStr === todayStr,
    });
  }

  return (
    <View style={calendarStyles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      
      {/* Selected Date Header Card */}
      <TouchableOpacity 
        style={calendarStyles.selectorBtn} 
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={[calendarStyles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Calendar color="#D97706" size={18} strokeWidth={2.2} />
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={calendarStyles.dateMainText}>{displaySelectedFormatted()}</Text>
              {selectedDate === todayStr ? (
                <View style={calendarStyles.todayBadge}>
                  <Text style={calendarStyles.todayBadgeText}>Today</Text>
                </View>
              ) : null}
            </View>
            <Text style={calendarStyles.dateSubText}>
              {selectedDate === todayStr ? 'Current work date' : selectedDate === yesterdayStr ? 'Yesterday' : 'Selected date'}
            </Text>
          </View>
        </View>

        <View style={calendarStyles.pickerBadge}>
          <Text style={calendarStyles.pickerBadgeText}>
            {isExpanded ? 'Close' : 'Calendar'}
          </Text>
          <ChevronDown 
            color="#1b2b4c" 
            size={13} 
            style={{ marginLeft: 3, transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} 
          />
        </View>
      </TouchableOpacity>

      {/* Quick shortcut pills */}
      <View style={calendarStyles.quickPillsRow}>
        <TouchableOpacity
          style={[calendarStyles.quickPill, selectedDate === todayStr && calendarStyles.quickPillActive]}
          onPress={() => onSelectDate(todayStr)}
          activeOpacity={0.7}
        >
          <Text style={[calendarStyles.quickPillText, selectedDate === todayStr && calendarStyles.quickPillTextActive]}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[calendarStyles.quickPill, selectedDate === yesterdayStr && calendarStyles.quickPillActive]}
          onPress={() => onSelectDate(yesterdayStr)}
          activeOpacity={0.7}
        >
          <Text style={[calendarStyles.quickPillText, selectedDate === yesterdayStr && calendarStyles.quickPillTextActive]}>
            Yesterday
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[calendarStyles.quickPill, selectedDate === twoDaysAgoStr && calendarStyles.quickPillActive]}
          onPress={() => onSelectDate(twoDaysAgoStr)}
          activeOpacity={0.7}
        >
          <Text style={[calendarStyles.quickPillText, selectedDate === twoDaysAgoStr && calendarStyles.quickPillTextActive]}>
            2 Days Ago
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expanded Interactive Calendar Grid */}
      {isExpanded && (
        <View style={calendarStyles.calendarBox}>
          {/* Month & Year Navigation */}
          <View style={calendarStyles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={calendarStyles.navArrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ChevronLeft color="#1E293B" size={18} />
            </TouchableOpacity>
            <Text style={calendarStyles.monthNavTitle}>
              {monthNames[month]} {year}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={calendarStyles.navArrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ChevronRight color="#1E293B" size={18} />
            </TouchableOpacity>
          </View>

          {/* Days of week */}
          <View style={calendarStyles.weekDaysRow}>
            {shortDays.map((d, i) => (
              <Text key={i} style={calendarStyles.weekDayText}>{d}</Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={calendarStyles.daysGrid}>
            {cells.map((cell) => {
              if (!cell.day) {
                return <View key={cell.key} style={calendarStyles.emptyDayCell} />;
              }
              return (
                <TouchableOpacity
                  key={cell.key}
                  onPress={() => handleDayPress(cell.day)}
                  style={[
                    calendarStyles.dayCell,
                    cell.isSelected && { backgroundColor: accentColor, borderRadius: 18 },
                    cell.isToday && !cell.isSelected && { borderWidth: 1.5, borderColor: accentColor, borderRadius: 18 }
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      calendarStyles.dayNumText,
                      cell.isSelected && { color: '#ffffff', fontWeight: '700' },
                      cell.isToday && !cell.isSelected && { color: accentColor, fontWeight: '700' }
                    ]}
                  >
                    {cell.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

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
  const [punchLoading, setPunchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Overtime state (Managed only by MD & HR)
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
  const [overtimeSaving, setOvertimeSaving] = useState(false);
  const [overtimeData, setOvertimeData] = useState({
    userId: '',
    date: getISTDateString(),
    hours: '1',
    minutes: '0',
    reason: ''
  });
  const [editingOtRecordId, setEditingOtRecordId] = useState(null);

  const [leaveRecords, setLeaveRecords] = useState([]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveData, setLeaveData] = useState({ type: 'Sick', startDate: '', endDate: '', reason: '' });

  const [earlyLeaves, setEarlyLeaves] = useState([]);
  const [isEarlyLeaveModalOpen, setIsEarlyLeaveModalOpen] = useState(false);
  const [earlyLeaveReason, setEarlyLeaveReason] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Keyboard tracking for Android & iOS bottom sheet modals
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Fetch immediately on initial mount
  useEffect(() => {
    fetchData();
  }, []);

  // Also auto-refresh whenever the screen comes into focus in bottom tabs
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 12, bounciness: 4, useNativeDriver: true })
    ]).start();
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const fetchData = async () => {
    try {
      let targetWs = workspace;
      let wsList = [];

      try {
        const wsRes = await axios.get('/workspaces');
        wsList = wsRes.data || [];
      } catch (wsErr) {
        // Fallback to cached workspace if available
        const cached = await loadWorkspaceCache();
        if (cached && cached.length > 0) {
          wsList = cached;
        }
      }

      if (wsList.length > 0) {
        targetWs = wsList[0];
        setWorkspace(targetWs);
        
        try {
          const detailRes = await axios.get(`/workspaces/${targetWs._id}`);
          const validMembers = (detailRes.data.members || []).filter(m => m.user);
          setWorkspaceMembers(validMembers);
          const me = validMembers.find(m => String(m.user._id || m.user) === String(user?._id));
          if (me) setCurrentUserRole(me.role);
        } catch (_) {}

        await Promise.all([
          fetchAttendance(targetWs._id),
          fetchLeaves(targetWs._id),
          fetchEarlyLeaves(targetWs._id)
        ]);
      }
    } catch (error) {
      console.error('Error fetching attendance workspace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (wsId) => {
    if (!wsId) return;
    try {
      const res = await axios.get(`/workspaces/${wsId}/attendance`);
      const records = Array.isArray(res.data) ? res.data : [];
      setAttendanceRecords(records);
      
      const todayStr = getISTDateString();
      const currentUid = String(user?._id || user?.id || '');
      const foundToday = records.find(r => r.date === todayStr && String(r.user?._id || r.user) === currentUid);
      
      setTodayRecord(foundToday || null);
      if (foundToday) {
        setIsCheckedIn(true);
        // User is checked out if and only if server record contains a checkOut timestamp
        setIsCheckedOut(Boolean(foundToday.checkOut));
      } else {
        setIsCheckedIn(false);
        setIsCheckedOut(false);
      }
    } catch (error) {
      console.log('Error fetching attendance records:', error?.message);
    }
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

  const getResolvedWorkspaceId = async () => {
    if (workspace?._id) return workspace._id;
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data && wsRes.data.length > 0) {
        setWorkspace(wsRes.data[0]);
        return wsRes.data[0]._id;
      }
    } catch (_) {}
    const cached = await loadWorkspaceCache();
    if (cached && cached.length > 0) {
      setWorkspace(cached[0]);
      return cached[0]._id;
    }
    return null;
  };

  const handleCheckIn = async () => {
    if (punchLoading) return;
    setPunchLoading(true);
    try {
      const wsId = await getResolvedWorkspaceId();
      if (!wsId) {
        Alert.alert('Notice', 'No workspace found. Please make sure you are assigned to a workspace.');
        return;
      }

      await axios.post(`/workspaces/${wsId}/attendance/checkin`);
      setIsCheckedIn(true);
      await fetchAttendance(wsId);
      Alert.alert('Success', 'Punched in successfully!');
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Check-in failed';
      if (msg.includes('Already checked in today')) {
        setIsCheckedIn(true);
        if (workspace?._id) fetchAttendance(workspace._id);
      }
      Alert.alert('Check-In', msg);
    } finally {
      setPunchLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (punchLoading) return;

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
      const todayStr = getISTDateString();
      const currentUid = String(user?._id || user?.id || '');
      const todayEarlyLeave = earlyLeaves.find(el => 
        String(el.user?._id || el.user || el.employee?._id || el.employee) === currentUid && 
        (el.date === todayStr || (el.date && new Date(el.date).toISOString().split('T')[0] === todayStr))
      );

      if (!todayEarlyLeave || todayEarlyLeave.status !== 'approved') {
        // Trigger early leave modal
        setIsEarlyLeaveModalOpen(true);
        return;
      }
    }

    setPunchLoading(true);
    try {
      const wsId = await getResolvedWorkspaceId();
      if (!wsId) {
        Alert.alert('Notice', 'No workspace found. Please try again.');
        return;
      }

      await axios.put(`/workspaces/${wsId}/attendance/checkout`);
      setIsCheckedOut(true);
      await fetchAttendance(wsId);
      Alert.alert('Success', 'Punched out successfully!');
    } catch (error) {
      if (error.response?.data?.requiresEarlyLeave) {
        setIsEarlyLeaveModalOpen(true);
      } else {
        Alert.alert('Check-Out', error.response?.data?.message || error.message || 'Check-out failed');
      }
    } finally {
      setPunchLoading(false);
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

  const isMDorHR = currentUserRole === 'super_admin' || currentUserRole === 'hr' || 
                   user?.role === 'super_admin' || user?.role === 'hr' ||
                   ['managing director', 'md', 'hr', 'human resources'].some(r => (user?.designation || '').toLowerCase().includes(r));

  const openOvertimeModal = (targetUserId = null, targetDate = null, record = null) => {
    if (!isMDorHR) {
      alert('Access denied: Overtime can only be logged by Managing Director (MD) and HR.');
      return;
    }

    const defaultUserId = targetUserId || (workspaceMembers.length > 0 ? (workspaceMembers[0].user?._id || workspaceMembers[0].user) : user?._id);
    const dateStr = targetDate || new Date().toISOString().split('T')[0];

    let h = '1';
    let m = '0';
    let rsn = '';
    let recId = null;

    if (record) {
      recId = record._id;
      if (record.overtimeMinutes > 0) {
        h = String(Math.floor(record.overtimeMinutes / 60));
        m = String(record.overtimeMinutes % 60);
        rsn = record.overtimeReason || '';
      }
    } else {
      const existing = attendanceRecords.find(r => 
        String(r.user?._id || r.user) === String(defaultUserId) && r.date === dateStr
      );
      if (existing && existing.overtimeMinutes > 0) {
        recId = existing._id;
        h = String(Math.floor(existing.overtimeMinutes / 60));
        m = String(existing.overtimeMinutes % 60);
        rsn = existing.overtimeReason || '';
      }
    }

    setEditingOtRecordId(recId);
    setOvertimeData({
      userId: String(defaultUserId || ''),
      date: dateStr,
      hours: h,
      minutes: m,
      reason: rsn
    });
    setIsOvertimeModalOpen(true);
  };

  const handleSelectOtEmployee = (uId) => {
    const existing = attendanceRecords.find(r => 
      String(r.user?._id || r.user) === String(uId) && r.date === overtimeData.date
    );
    if (existing && existing.overtimeMinutes > 0) {
      setEditingOtRecordId(existing._id);
      setOvertimeData({
        ...overtimeData,
        userId: uId,
        hours: String(Math.floor(existing.overtimeMinutes / 60)),
        minutes: String(existing.overtimeMinutes % 60),
        reason: existing.overtimeReason || ''
      });
    } else {
      setEditingOtRecordId(null);
      setOvertimeData({
        ...overtimeData,
        userId: uId
      });
    }
  };

  const handleSelectOtDate = (newDate) => {
    const existing = attendanceRecords.find(r => 
      String(r.user?._id || r.user) === String(overtimeData.userId) && r.date === newDate
    );
    if (existing && existing.overtimeMinutes > 0) {
      setEditingOtRecordId(existing._id);
      setOvertimeData({
        ...overtimeData,
        date: newDate,
        hours: String(Math.floor(existing.overtimeMinutes / 60)),
        minutes: String(existing.overtimeMinutes % 60),
        reason: existing.overtimeReason || ''
      });
    } else {
      setEditingOtRecordId(null);
      setOvertimeData({
        ...overtimeData,
        date: newDate
      });
    }
  };

  const handleSaveOvertime = async () => {
    if (!isMDorHR) {
      alert('Access denied: Only MD and HR can record overtime.');
      return;
    }
    if (!workspace) return;
    if (!overtimeData.userId) {
      alert('Please select an employee.');
      return;
    }

    const hrs = parseInt(overtimeData.hours, 10) || 0;
    const mins = parseInt(overtimeData.minutes, 10) || 0;
    const totalMinutes = hrs * 60 + mins;

    if (totalMinutes <= 0) {
      alert('Please enter an overtime duration greater than 0 minutes.');
      return;
    }

    setOvertimeSaving(true);
    try {
      const res = await axios.post(`/workspaces/${workspace._id}/attendance/overtime`, {
        userId: overtimeData.userId,
        date: overtimeData.date,
        overtimeMinutes: totalMinutes,
        overtimeHours: +(totalMinutes / 60).toFixed(2),
        reason: overtimeData.reason.trim()
      });
      alert(res.data.message || 'Overtime recorded successfully!');
      setIsOvertimeModalOpen(false);
      fetchAttendance(workspace._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record overtime');
    } finally {
      setOvertimeSaving(false);
    }
  };

  const handleRemoveOvertime = async (recordId) => {
    if (!isMDorHR) return;
    if (!recordId) return;

    try {
      await axios.delete(`/workspaces/${workspace._id}/attendance/${recordId}/overtime`);
      alert('Overtime removed successfully');
      setIsOvertimeModalOpen(false);
      fetchAttendance(workspace._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove overtime');
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
        ) : (activeTab === 'attendance' && isMDorHR) ? (
          <TouchableOpacity onPress={() => openOvertimeModal()} style={styles.headerOtBtn} activeOpacity={0.8}>
            <Clock color="#D97706" size={14} style={{ marginRight: 4 }} />
            <Text style={styles.headerOtText}>+ OT</Text>
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
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} tintColor={PRIMARY} />
          }
        >
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
                        style={[styles.punchActionBtn, { backgroundColor: PRIMARY }, punchLoading && { opacity: 0.75 }]} 
                        onPress={handleCheckIn}
                        disabled={punchLoading}
                        activeOpacity={0.8}
                      >
                        {punchLoading ? (
                          <ActivityIndicator color="#ffffff" size="small" style={{ marginRight: 8 }} />
                        ) : (
                          <LogIn color="#ffffff" size={16} style={{ marginRight: 8 }} />
                        )}
                        <Text style={styles.punchActionBtnText}>
                          {punchLoading ? 'Punching In...' : 'Punch In'}
                        </Text>
                      </TouchableOpacity>
                    ) : !isCheckedOut ? (
                      <TouchableOpacity 
                        style={[styles.punchActionBtn, { backgroundColor: '#D97706' }, punchLoading && { opacity: 0.75 }]} 
                        onPress={handleCheckOut}
                        disabled={punchLoading}
                        activeOpacity={0.8}
                      >
                        {punchLoading ? (
                          <ActivityIndicator color="#ffffff" size="small" style={{ marginRight: 8 }} />
                        ) : (
                          <LogOut color="#ffffff" size={16} style={{ marginRight: 8 }} />
                        )}
                        <Text style={styles.punchActionBtnText}>
                          {punchLoading ? 'Punching Out...' : 'Punch Out'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.completedBadge}>
                        <CheckCircle color="#10B981" size={16} style={{ marginRight: 6 }} />
                        <Text style={styles.completedText}>
                          {todayRecord?.overtimeMinutes > 0 
                            ? `Shift & OT Done (+${todayRecord.overtimeHours || +(todayRecord.overtimeMinutes / 60).toFixed(1)}h)` 
                            : 'Shift Completed'}
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

                <View style={styles.logHeaderRow}>
                  <Text style={styles.sectionTitle}>{logView === 'mine' ? 'My Recent Logs' : 'Team Recent Logs'}</Text>
                  {isMDorHR && (
                    <TouchableOpacity 
                      style={styles.addOtButton}
                      onPress={() => openOvertimeModal()}
                      activeOpacity={0.8}
                    >
                      <Clock color="#D97706" size={13} style={{ marginRight: 4 }} />
                      <Text style={styles.addOtButtonText}>+ Log OT</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {attendanceRecords.filter(r => logView === 'mine' ? String(r.user?._id || r.user) === String(user._id) : true).length === 0 ? (
                  <Text style={styles.emptyText}>No attendance records found.</Text>
                ) : (
                  attendanceRecords.filter(r => logView === 'mine' ? String(r.user?._id || r.user) === String(user._id) : true).map((record, index) => (
                    <View key={record._id || index} style={styles.recordCard}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        {logView === 'team' && <Text style={styles.recordName}>{record.user?.name || 'Employee'}</Text>}
                        <Text style={styles.recordDate}>{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                        <Text style={styles.recordStatus}>{record.status}</Text>
                        {record.overtimeReason ? (
                          <Text style={styles.recordOtReason} numberOfLines={1}>OT: {record.overtimeReason}</Text>
                        ) : null}
                      </View>
                      <View style={styles.timesWrapper}>
                        <Text style={styles.timeText}>IN: {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</Text>
                        <Text style={styles.timeText}>OUT: {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</Text>
                        {record.overtimeMinutes > 0 ? (
                          <View style={styles.otBadgeRow}>
                            <View style={styles.otBadge}>
                              <Clock color="#D97706" size={11} style={{ marginRight: 3 }} />
                              <Text style={styles.otBadgeText}>
                                +{record.overtimeHours || +(record.overtimeMinutes / 60).toFixed(1)}h OT
                              </Text>
                            </View>
                            {isMDorHR && (
                              <TouchableOpacity 
                                style={styles.otActionIconBtn}
                                onPress={() => openOvertimeModal(record.user?._id || record.user, record.date, record)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Edit3 color="#64748B" size={12} />
                              </TouchableOpacity>
                            )}
                          </View>
                        ) : (isMDorHR && logView === 'team') ? (
                          <TouchableOpacity 
                            style={styles.addOtRowBtn}
                            onPress={() => openOvertimeModal(record.user?._id || record.user, record.date, record)}
                          >
                            <Text style={styles.addOtRowBtnText}>+ OT</Text>
                          </TouchableOpacity>
                        ) : null}
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
      <Modal visible={isLeaveModalOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setIsLeaveModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalBottomContainer, { paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }]}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
              style={{ width: '100%' }}
            >
              <View style={[
                styles.modalContent,
                keyboardHeight > 0 && { maxHeight: Math.max(300, SCREEN_HEIGHT - keyboardHeight - 40) }
              ]}>
                {/* Drag handle */}
                <View style={styles.modalDragHandle} />

                <ScrollView 
                  showsVerticalScrollIndicator={false} 
                  keyboardShouldPersistTaps="handled" 
                  keyboardDismissMode="on-drag"
                  bounces={false}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Apply Leave</Text>
                    <TouchableOpacity onPress={() => setIsLeaveModalOpen(false)} style={styles.modalCloseBtn}>
                      <X color="#111827" size={18} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Leave Type</Text>
                  <View style={styles.typeContainer}>
                    {['Sick', 'Casual', 'Earned'].map(t => (
                      <TouchableOpacity 
                        key={t}
                        style={[styles.typeBtn, leaveData.type === t && { borderColor: PRIMARY, backgroundColor: PRIMARY }]}
                        onPress={() => setLeaveData({...leaveData, type: t})}
                      >
                        <Text style={[styles.typeBtnText, leaveData.type === t && { color: '#ffffff', fontWeight: '700' }]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <InlineCalendarPicker
                    label="Start Date"
                    selectedDate={leaveData.startDate}
                    onSelectDate={(d) => setLeaveData({...leaveData, startDate: d})}
                    accentColor={PRIMARY}
                  />

                  <InlineCalendarPicker
                    label="End Date"
                    selectedDate={leaveData.endDate}
                    onSelectDate={(d) => setLeaveData({...leaveData, endDate: d})}
                    accentColor={PRIMARY}
                  />

                  <Text style={styles.label}>Reason</Text>
                  <TextInput 
                    style={[styles.input, { height: 75 }]} 
                    value={leaveData.reason}
                    onChangeText={(t) => setLeaveData({...leaveData, reason: t})}
                    multiline
                    placeholder="Why are you taking leave?"
                    placeholderTextColor="#94A3B8"
                  />

                  <TouchableOpacity style={styles.submitBtn} onPress={handleApplyLeave}>
                    <Text style={styles.submitBtnText}>Submit Leave Request</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* Early Leave Modal */}
      <Modal visible={isEarlyLeaveModalOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setIsEarlyLeaveModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalBottomContainer, { paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }]}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
              style={{ width: '100%' }}
            >
              <View style={[
                styles.modalContent,
                keyboardHeight > 0 && { maxHeight: Math.max(300, SCREEN_HEIGHT - keyboardHeight - 40) }
              ]}>
                {/* Drag handle */}
                <View style={styles.modalDragHandle} />

                <ScrollView 
                  showsVerticalScrollIndicator={false} 
                  keyboardShouldPersistTaps="handled" 
                  keyboardDismissMode="on-drag"
                  bounces={false}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Early Checkout</Text>
                    <TouchableOpacity onPress={() => setIsEarlyLeaveModalOpen(false)} style={styles.modalCloseBtn}>
                      <X color="#111827" size={18} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B18', padding: 12, borderRadius: 12, marginBottom: 16 }}>
                    <AlertTriangle color="#F59E0B" size={18} style={{ marginRight: 10 }} />
                    <Text style={{ flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17, fontWeight: '500' }}>
                      It's before shift end time. Checking out now requires an Early Leave request.
                    </Text>
                  </View>

                  <Text style={styles.label}>Reason for Early Leave</Text>
                  <TextInput 
                    style={[styles.input, { height: 90 }]} 
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
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* Overtime (OT) Modal - Managed only by MD & HR */}
      <Modal visible={isOvertimeModalOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setIsOvertimeModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalBottomContainer, { paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }]}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
              style={{ width: '100%' }}
            >
              <View style={[
                styles.modalContent,
                keyboardHeight > 0 && { maxHeight: Math.max(340, SCREEN_HEIGHT - keyboardHeight - 40) }
              ]}>
                {/* Drag handle */}
                <View style={styles.modalDragHandle} />

                <ScrollView 
                  showsVerticalScrollIndicator={false} 
                  keyboardShouldPersistTaps="handled" 
                  keyboardDismissMode="on-drag"
                  bounces={false}
                >
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.otModalIconBox}>
                        <Clock color="#D97706" size={19} strokeWidth={2.2} />
                      </View>
                      <View style={{ marginLeft: 10 }}>
                        <Text style={styles.modalTitle}>{editingOtRecordId ? 'Edit Overtime' : 'Log Overtime'}</Text>
                        <Text style={styles.otModalSub}>MD & HR Management</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setIsOvertimeModalOpen(false)} style={styles.modalCloseBtn}>
                      <X color="#475569" size={18} />
                    </TouchableOpacity>
                  </View>

                  {/* Employee Selection */}
                  <Text style={styles.label}>Select Employee *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 2, paddingHorizontal: 2 }} style={{ marginBottom: 14 }}>
                    {workspaceMembers.map((m) => {
                      const uId = String(m.user?._id || m.user);
                      const isSelected = overtimeData.userId === uId;
                      const empName = m.user?.name || 'Employee';
                      const initials = empName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'EM';
                      return (
                        <TouchableOpacity
                          key={uId}
                          onPress={() => handleSelectOtEmployee(uId)}
                          style={[styles.memberChip, isSelected && styles.memberChipSelected]}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.memberAvatar, isSelected && styles.memberAvatarSelected]}>
                            <Text style={[styles.memberAvatarText, isSelected && styles.memberAvatarTextSelected]}>
                              {initials}
                            </Text>
                          </View>
                          <View style={{ flexShrink: 1, maxWidth: 140 }}>
                            <Text style={[styles.memberChipText, isSelected && styles.memberChipTextSelected]} numberOfLines={1}>
                              {empName}
                            </Text>
                            {m.user?.designation ? (
                              <Text style={[styles.memberChipSub, isSelected && styles.memberChipSubSelected]} numberOfLines={1}>
                                {m.user?.designation}
                              </Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Interactive Calendar Date Picker */}
                  <InlineCalendarPicker
                    label="Date *"
                    selectedDate={overtimeData.date}
                    onSelectDate={handleSelectOtDate}
                    accentColor="#D97706"
                  />

                  {/* Duration Presets */}
                  <Text style={styles.label}>Duration Presets</Text>
                  <View style={styles.presetRow}>
                    {[
                      { label: '+30m', h: '0', m: '30' },
                      { label: '+1h', h: '1', m: '0' },
                      { label: '+1.5h', h: '1', m: '30' },
                      { label: '+2h', h: '2', m: '0' },
                      { label: '+3h', h: '3', m: '0' },
                      { label: '+4h', h: '4', m: '0' },
                    ].map((p, idx) => {
                      const isCurr = overtimeData.hours === p.h && overtimeData.minutes === p.m;
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setOvertimeData({ ...overtimeData, hours: p.h, minutes: p.m })}
                          style={[styles.otPresetBtn, isCurr && styles.otPresetBtnActive]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.otPresetBtnText, isCurr && styles.otPresetBtnTextActive]}>
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Custom Hours & Minutes Unified Card */}
                  <Text style={styles.label}>Custom Duration</Text>
                  <View style={styles.durationCard}>
                    {/* Hours Stepper */}
                    <View style={styles.stepperPill}>
                      <Text style={styles.stepperLabel}>Hours</Text>
                      <View style={styles.stepperControlRow}>
                        <TouchableOpacity 
                          style={styles.circleStepBtn} 
                          onPress={() => {
                            const current = Math.max(0, (parseInt(overtimeData.hours, 10) || 0) - 1);
                            setOvertimeData({ ...overtimeData, hours: String(current) });
                          }}
                          activeOpacity={0.7}
                        >
                          <Minus color="#1b2b4c" size={15} strokeWidth={2.5} />
                        </TouchableOpacity>
                        
                        <View style={styles.stepperValueBox}>
                          <TextInput 
                            style={styles.stepperValueInput}
                            keyboardType="numeric"
                            value={overtimeData.hours}
                            onChangeText={(t) => setOvertimeData({ ...overtimeData, hours: t })}
                          />
                          <Text style={styles.stepperUnitText}>hrs</Text>
                        </View>

                        <TouchableOpacity 
                          style={styles.circleStepBtn} 
                          onPress={() => {
                            const current = (parseInt(overtimeData.hours, 10) || 0) + 1;
                            setOvertimeData({ ...overtimeData, hours: String(current) });
                          }}
                          activeOpacity={0.7}
                        >
                          <Plus color="#1b2b4c" size={15} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Minutes Stepper */}
                    <View style={styles.stepperPill}>
                      <Text style={styles.stepperLabel}>Minutes</Text>
                      <View style={styles.stepperControlRow}>
                        <TouchableOpacity 
                          style={styles.circleStepBtn} 
                          onPress={() => {
                            const current = Math.max(0, (parseInt(overtimeData.minutes, 10) || 0) - 15);
                            setOvertimeData({ ...overtimeData, minutes: String(current) });
                          }}
                          activeOpacity={0.7}
                        >
                          <Minus color="#1b2b4c" size={15} strokeWidth={2.5} />
                        </TouchableOpacity>
                        
                        <View style={styles.stepperValueBox}>
                          <TextInput 
                            style={styles.stepperValueInput}
                            keyboardType="numeric"
                            value={overtimeData.minutes}
                            onChangeText={(t) => setOvertimeData({ ...overtimeData, minutes: t })}
                          />
                          <Text style={styles.stepperUnitText}>min</Text>
                        </View>

                        <TouchableOpacity 
                          style={styles.circleStepBtn} 
                          onPress={() => {
                            const current = Math.min(59, (parseInt(overtimeData.minutes, 10) || 0) + 15);
                            setOvertimeData({ ...overtimeData, minutes: String(current) });
                          }}
                          activeOpacity={0.7}
                        >
                          <Plus color="#1b2b4c" size={15} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Overtime Reason */}
                  <Text style={styles.label}>Reason / Note (Optional)</Text>
                  <TextInput 
                    style={[styles.input, { height: 72 }]} 
                    value={overtimeData.reason}
                    onChangeText={(t) => setOvertimeData({ ...overtimeData, reason: t })}
                    multiline
                    placeholder="e.g. Critical release, extra hours..."
                    placeholderTextColor="#94A3B8"
                  />

                  {/* Buttons */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    {editingOtRecordId ? (
                      <TouchableOpacity 
                        style={styles.removeOtBtn}
                        onPress={() => handleRemoveOvertime(editingOtRecordId)}
                        disabled={overtimeSaving}
                        activeOpacity={0.7}
                      >
                        <Trash2 color="#EF4444" size={16} style={{ marginRight: 4 }} />
                        <Text style={styles.removeOtBtnText}>Remove</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity 
                      style={[styles.submitBtn, { flex: 1, backgroundColor: '#D97706', marginTop: 0 }]} 
                      onPress={handleSaveOvertime}
                      disabled={overtimeSaving}
                      activeOpacity={0.85}
                    >
                      {overtimeSaving ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Clock color="#ffffff" size={16} strokeWidth={2.2} style={{ marginRight: 6 }} />
                          <Text style={styles.submitBtnText}>
                            {editingOtRecordId ? 'Update Overtime' : 'Save & Log Overtime'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.5)', justifyContent: 'flex-end' },
  modalBottomContainer: { width: '100%', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, backgroundColor: '#ffffff', maxHeight: '85%', width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, color: '#64748B' },
  typeContainer: { flexDirection: 'row', marginBottom: 16 },
  typeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginRight: 8, borderColor: '#E2E8F0', backgroundColor: '#F1F5F9' },
  typeBtnText: { fontWeight: '600', fontSize: 13, color: '#64748B' },
  dateRow: { flexDirection: 'row', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 16, backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', color: '#111827' },
  submitBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, backgroundColor: PRIMARY },
  submitBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },

  // Overtime (OT) styles
  headerOtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  headerOtText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '700',
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  addOtButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addOtButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  recordOtReason: {
    fontSize: 11,
    color: '#D97706',
    fontStyle: 'italic',
    marginTop: 2,
  },
  otBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  otBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  otBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  otActionIconBtn: {
    padding: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
  },
  addOtRowBtn: {
    marginTop: 4,
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  addOtRowBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  otModalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otModalSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
    marginTop: 1,
  },
  modalDragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  memberChipSelected: {
    borderColor: '#1b2b4c',
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  memberAvatarSelected: {
    backgroundColor: '#1b2b4c',
  },
  memberAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  memberAvatarTextSelected: {
    color: '#ffca22',
  },
  memberChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  memberChipTextSelected: {
    color: '#1b2b4c',
    fontWeight: '700',
  },
  memberChipSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  memberChipSubSelected: {
    color: '#475569',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  otPresetBtn: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  otPresetBtnActive: {
    borderColor: '#1b2b4c',
    backgroundColor: '#1b2b4c',
  },
  otPresetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  otPresetBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  durationCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  stepperPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    alignItems: 'center',
  },
  stepperLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  stepperControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  circleStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stepperValueBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    minWidth: 44,
  },
  stepperValueInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    padding: 0,
    minWidth: 26,
  },
  stepperUnitText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 3,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
    height: 48,
    marginBottom: 16,
  },
  stepperBtn: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  stepperInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    height: '100%',
    padding: 0,
  },
  removeOtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  removeOtBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
});

const calendarStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMainText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  todayBadge: {
    marginLeft: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  pickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  pickerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1b2b4c',
  },
  quickPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  quickPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  quickPillActive: {
    borderColor: '#1b2b4c',
    backgroundColor: '#1b2b4c',
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  quickPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calendarBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  navArrowBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  monthNavTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  emptyDayCell: {
    width: 36,
    height: 36,
    marginVertical: 2,
  },
  dayCell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayNumText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
});
