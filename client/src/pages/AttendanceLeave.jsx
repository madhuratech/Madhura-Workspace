import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, FileText, Check, X, LogIn, LogOut, ChevronLeft, ChevronRight, User } from 'lucide-react';
import Avatar from '../components/Avatar';

const DigitalClock = ({ className = "" }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`flex flex-col items-center justify-center bg-bg-secondary rounded-xl px-4 py-2 border border-border shadow-inner shrink-0 ${className}`}>
      <div className="font-mono text-xl font-bold text-accent-blue tracking-wider">
        {time.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-[9px] text-text-secondary uppercase tracking-widest font-semibold mt-0.5">
        Current Time
      </div>
    </div>
  );
};

const formatMinutes = (totalMinutes) => {
  if (!totalMinutes) return '0 mins';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0 && minutes > 0) {
    return `${hours} hour ${minutes} mins`;
  } else if (hours > 0) {
    return `${hours} hour`;
  } else {
    return `${minutes} mins`;
  }
};

const AttendanceLeave = () => {
  const { user, socket } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [logView, setLogView] = useState('mine');
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('employee');
  const [activeTab, setActiveTab] = useState('attendance');
  
  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);

  // Overtime State (Managed by Managing Director & HR)
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
  const [overtimeSaving, setOvertimeSaving] = useState(false);
  const [overtimeData, setOvertimeData] = useState({
    userId: '',
    date: new Date().toISOString().split('T')[0],
    hours: 1,
    minutes: 0,
    reason: ''
  });

  // Calendar State
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDateRecord, setSelectedDateRecord] = useState(null);
  const [selectedTeamMember, setSelectedTeamMember] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);

  // Leave State
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveData, setLeaveData] = useState({ type: 'Sick', startDate: '', endDate: '', reason: '' });

  // Early Leave State
  const [earlyLeaves, setEarlyLeaves] = useState([]);
  const [isEarlyLeaveModalOpen, setIsEarlyLeaveModalOpen] = useState(false);
  const [earlyLeaveData, setEarlyLeaveData] = useState({ reason: '', requestedLeaveTime: '' });
  const [todayEarlyLeaveStatus, setTodayEarlyLeaveStatus] = useState(null);

  const isMDorHR = currentUserRole === 'super_admin' || currentUserRole === 'hr' || user?.role === 'super_admin' || user?.role === 'hr';

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  // Listen for real-time attendance & overtime updates via socket
  useEffect(() => {
    if (!socket || !workspace) return;
    const handleAttendanceUpdate = () => {
      fetchAttendance(workspace._id);
    };
    socket.on('attendance_updated', handleAttendanceUpdate);
    return () => {
      socket.off('attendance_updated', handleAttendanceUpdate);
    };
  }, [socket, workspace]);

  // Periodic check if current time reached employee's shift end time
  useEffect(() => {
    if (!isCheckedIn || isCheckedOut || !workspace) return;
    const timer = setInterval(() => {
      const now = new Date();
      const [endH, endM] = (user?.shiftEndTime || '18:00').split(':').map(Number);
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const shiftEndMins = (endH || 18) * 60 + (endM || 0);
      if (currentMins >= shiftEndMins) {
        fetchAttendance(workspace._id);
      }
    }, 20000);
    return () => clearInterval(timer);
  }, [isCheckedIn, isCheckedOut, workspace, user]);

  const fetchWorkspaceData = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const currentWs = wsRes.data[0];
        setWorkspace(currentWs);
        
        fetchAttendance(currentWs._id);
        fetchLeaves(currentWs._id);
        fetchEarlyLeaves(currentWs._id);
        
        const detailRes = await axios.get(`/workspaces/${currentWs._id}`);
        const validMembers = (detailRes.data.members || []).filter(m => m.user);
        setTeamMembers(validMembers);
        
        const me = validMembers.find(m => m.user._id === user._id);
        if (me) {
          setCurrentUserRole(me.role);
        }
      }
    } catch (error) {
      console.error('Error fetching workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (wsId) => {
    try {
      const res = await axios.get(`/workspaces/${wsId}/attendance`);
      setAttendanceRecords(res.data);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todayRecord = res.data.find(r => r.date === todayStr && (r.user?._id === user._id || r.user === user._id));
      
      setTodayAttendance(todayRecord || null);
      if (todayRecord) {
        setIsCheckedIn(true);
        if (todayRecord.checkOut) {
          setIsCheckedOut(true);
        } else {
          // If past shift end and no overtime pending, mark as completed
          const now = new Date();
          const [endH, endM] = (user?.shiftEndTime || '18:00').split(':').map(Number);
          const currentMins = now.getHours() * 60 + now.getMinutes();
          const shiftEndMins = (endH || 18) * 60 + (endM || 0);
          if (currentMins >= shiftEndMins && (!todayRecord.overtimeMinutes || todayRecord.overtimeMinutes === 0)) {
            setIsCheckedOut(true);
          } else {
            setIsCheckedOut(false);
          }
        }
        if (todayRecord.earlyLeaveApproved) {
          setTodayEarlyLeaveStatus('approved');
        }
      } else {
        setIsCheckedIn(false);
        setIsCheckedOut(false);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const openOvertimeModal = (targetUser = null, targetDate = null) => {
    const defaultUser = targetUser || selectedTeamMember || (teamMembers.length > 0 ? teamMembers[0].user : null);
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    
    let existingHours = 1;
    let existingMins = 0;
    let existingReason = '';
    
    if (defaultUser) {
      const existing = attendanceRecords.find(r => (r.user?._id === defaultUser._id || r.user === defaultUser._id) && r.date === dateStr);
      if (existing && existing.overtimeMinutes > 0) {
        existingHours = Math.floor(existing.overtimeMinutes / 60);
        existingMins = existing.overtimeMinutes % 60;
        existingReason = existing.overtimeReason || '';
      }
    }

    setOvertimeData({
      userId: defaultUser ? defaultUser._id : '',
      date: dateStr,
      hours: existingHours,
      minutes: existingMins,
      reason: existingReason
    });
    setIsOvertimeModalOpen(true);
  };

  const handleSaveOvertime = async (e) => {
    e.preventDefault();
    if (!workspace) return;
    if (!overtimeData.userId) {
      showToast('Please select a team member', 'error');
      return;
    }
    const totalMinutes = (parseInt(overtimeData.hours, 10) || 0) * 60 + (parseInt(overtimeData.minutes, 10) || 0);
    if (totalMinutes <= 0) {
      showToast('Please enter an overtime duration greater than 0 minutes', 'error');
      return;
    }

    setOvertimeSaving(true);
    try {
      const res = await axios.post(`/workspaces/${workspace._id}/attendance/overtime`, {
        userId: overtimeData.userId,
        date: overtimeData.date,
        overtimeMinutes: totalMinutes,
        overtimeHours: +(totalMinutes / 60).toFixed(2),
        reason: overtimeData.reason
      });
      showToast(res.data.message || 'Overtime recorded successfully!', 'success');
      setIsOvertimeModalOpen(false);
      fetchAttendance(workspace._id);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to record overtime', 'error');
    } finally {
      setOvertimeSaving(false);
    }
  };

  const handleRemoveOvertime = async (recordId) => {
    if (!window.confirm('Are you sure you want to remove this overtime record?')) return;
    try {
      const res = await axios.delete(`/workspaces/${workspace._id}/attendance/${recordId}/overtime`);
      showToast(res.data.message || 'Overtime removed', 'success');
      fetchAttendance(workspace._id);
      setSelectedDateRecord(null);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to remove overtime', 'error');
    }
  };

  const fetchLeaves = async (wsId) => {
    try {
      const res = await axios.get(`/workspaces/${wsId}/leaves`);
      setLeaveRecords(res.data);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    }
  };

  const fetchEarlyLeaves = async (wsId) => {
    try {
      const res = await axios.get(`/workspaces/${wsId}/early-leaves`);
      setEarlyLeaves(res.data);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todayReq = res.data.find(r => r.date === todayStr && r.employee?._id === user._id);
      if (todayReq && todayEarlyLeaveStatus !== 'approved') {
        setTodayEarlyLeaveStatus(todayReq.status);
      }
    } catch (error) {
      console.error('Error fetching early leaves:', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      await axios.post(`/workspaces/${workspace._id}/attendance/checkin`);
      showToast('Checked in successfully!', 'success');
      setIsCheckedIn(true);
      fetchAttendance(workspace._id);
    } catch (error) {
      showToast(error.response?.data?.message || 'Check-in failed', 'error');
    }
  };

  const handleCheckOut = async () => {
    const now = new Date();
    const shiftEndTime = user?.shiftEndTime || '18:00';
    const [shiftEndHour, shiftEndMin] = shiftEndTime.split(':').map(Number);
    const currentTotalMin = now.getHours() * 60 + now.getMinutes();
    const shiftEndTotalMin = (shiftEndHour || 18) * 60 + (shiftEndMin || 0);
    
    if (currentTotalMin < shiftEndTotalMin && todayEarlyLeaveStatus !== 'approved') {
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      setEarlyLeaveData({ ...earlyLeaveData, requestedLeaveTime: timeStr });
      setIsEarlyLeaveModalOpen(true);
      return;
    }

    try {
      await axios.put(`/workspaces/${workspace._id}/attendance/checkout`);
      showToast('Checked out successfully!', 'success');
      setIsCheckedOut(true);
      fetchAttendance(workspace._id);
    } catch (error) {
      if (error.response?.data?.requiresEarlyLeave) {
         setIsEarlyLeaveModalOpen(true);
      } else {
         showToast(error.response?.data?.message || 'Check-out failed', 'error');
      }
    }
  };

  const submitEarlyLeave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...earlyLeaveData,
        requestedLeaveTime: earlyLeaveData.requestedLeaveTime || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
      };
      await axios.post(`/workspaces/${workspace._id}/early-leaves`, payload);
      showToast('Early leave request submitted', 'success');
      setIsEarlyLeaveModalOpen(false);
      setTodayEarlyLeaveStatus('pending_hr');
      fetchEarlyLeaves(workspace._id);
    } catch (error) {
      showToast(error.response?.data?.message || 'Error submitting request', 'error');
    }
  };

  const handleEarlyLeaveApproval = async (id, action) => {
    try {
      await axios.put(`/workspaces/${workspace._id}/early-leaves/${id}/${action}`, { note: 'Processed via Dashboard' });
      showToast(`Request ${action}d`, 'success');
      fetchEarlyLeaves(workspace._id);
      if (action === 'approve') {
         fetchAttendance(workspace._id);
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Error processing request', 'error');
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!workspace) return;
    try {
      await axios.post(`/workspaces/${workspace._id}/leaves`, leaveData);
      showToast('Leave applied successfully!', 'success');
      setIsLeaveModalOpen(false);
      setLeaveData({ type: 'Sick', startDate: '', endDate: '', reason: '' });
      fetchLeaves(workspace._id);
    } catch (error) {
      showToast(error.response?.data?.message || 'Error applying for leave', 'error');
    }
  };

  const handleLeaveStatus = async (leaveId, status) => {
    try {
      await axios.put(`/workspaces/${workspace._id}/leaves/${leaveId}/status`, { status });
      showToast(`Leave ${status.toLowerCase()} successfully`, 'success');
      fetchLeaves(workspace._id);
    } catch (error) {
      showToast(error.response?.data?.message || 'Error updating status', 'error');
    }
  };

  // --- Calendar Helpers ---
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const getCalendarRecordsMap = (targetUserId) => {
    const map = {};
    attendanceRecords.forEach(record => {
      if (record.user?._id === targetUserId && record.date) {
        map[record.date] = record;
      }
    });
    return map;
  };

  const getCleanCheckOut = (rec) => {
    if (!rec || !rec.checkOut) return null;
    if (rec.isAutoCheckOut) {
      // Auto shift checkout reflects the user's scheduled shift end time
      const shiftEndStr = rec.user?.shiftEndTime || (selectedTeamMember?._id === rec.user?._id ? selectedTeamMember?.shiftEndTime : null) || user?.shiftEndTime || '18:00';
      const [hStr, mStr] = shiftEndStr.split(':');
      const h = parseInt(hStr, 10) || 18;
      const m = parseInt(mStr, 10) || 0;
      const d = new Date(rec.checkOut);
      d.setHours(h, m, 0, 0);
      return d;
    }
    return new Date(rec.checkOut);
  };

  const formatDisplayTime = (d) => {
    if (!d) return '--:--';
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderCalendar = (targetUserId) => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const recordsMap = getCalendarRecordsMap(targetUserId);

    const blanks = Array.from({ length: firstDay }, (_, i) => <div key={`blank-${i}`} className="p-2 border border-transparent"></div>);
    
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = recordsMap[dateStr];
      const isToday = dateStr === today.toISOString().split('T')[0];

      let bgColorClass = 'bg-bg-primary hover:bg-bg-secondary';
      let borderClass = 'border-border/50';
      let dot = null;

      if (record) {
        if (record.status === 'Present') {
          dot = <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>;
          if (record.isLate) dot = <span className="w-2 h-2 rounded-full bg-danger shadow-[0_0_6px_rgba(239,68,68,0.5)]"></span>;
          if (record.isEarlyLeave) dot = <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]"></span>;
        } else if (record.status === 'Absent') {
          dot = <span className="w-2 h-2 rounded-full bg-danger"></span>;
          bgColorClass = 'bg-danger/5';
        }
      }

      const cleanCheckOut = record ? getCleanCheckOut(record) : null;

      return (
        <div 
          key={dateStr} 
          onClick={() => setSelectedDateRecord({ date: dateStr, record, day })}
          className={`relative min-h-[58px] md:min-h-[105px] md:h-28 p-1.5 md:p-2.5 flex flex-col justify-between border ${borderClass} rounded-xl md:rounded-2xl ${bgColorClass} cursor-pointer transition-all duration-200 group hover:border-accent-blue/50 hover:shadow-md ${isToday ? 'ring-2 ring-accent-blue shadow-sm' : ''}`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs md:text-sm font-bold ${isToday ? 'text-accent-blue font-black' : 'text-text-primary'}`}>{day}</span>
            {dot}
          </div>
          {record && (
            <div className="mt-auto space-y-1 hidden md:block">
              <div className="bg-bg-secondary/80 backdrop-blur-xs rounded-lg px-2 py-1 border border-border/50 text-[10px] space-y-0.5 shadow-2xs">
                <div className="flex items-center justify-between leading-tight text-text-secondary">
                  <span className="text-[9px] font-bold text-text-secondary/70 uppercase">In</span>
                  <span className="font-semibold text-text-primary text-[10px] tabular-nums">
                    {record.checkIn ? formatDisplayTime(record.checkIn) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between leading-tight text-text-secondary">
                  <span className="text-[9px] font-bold text-text-secondary/70 uppercase">Out</span>
                  <span className="font-semibold text-text-primary text-[10px] tabular-nums">
                    {cleanCheckOut ? formatDisplayTime(cleanCheckOut) : '—'}
                  </span>
                </div>
              </div>
              {record.overtimeMinutes > 0 && (
                <div className="flex items-center justify-center py-0.5 px-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[9px] border border-amber-500/25 leading-none shadow-2xs">
                  +{record.overtimeHours || +(record.overtimeMinutes / 60).toFixed(1)}h OT
                </div>
              )}
            </div>
          )}
        </div>
      );
    });

    return (
      <div className="flex-1 flex flex-col h-full">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-xl font-bold text-text-primary font-outfit">
            {new Date(currentYear, currentMonth).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button onClick={handlePrevMonth} className="p-2 rounded-lg bg-bg-primary hover:bg-accent-blue hover:text-white transition-colors border border-border/50 shadow-sm text-text-secondary">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); }} className="px-4 py-2 text-sm font-bold rounded-lg bg-bg-primary hover:bg-bg-secondary transition-colors border border-border/50 shadow-sm text-text-primary">
              Today
            </button>
            <button onClick={handleNextMonth} className="p-2 rounded-lg bg-bg-primary hover:bg-accent-blue hover:text-white transition-colors border border-border/50 shadow-sm text-text-secondary">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        
        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 md:gap-3 mb-1 md:mb-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[9px] md:text-xs font-bold text-text-secondary uppercase tracking-widest">{d.substring(0,3)}</div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 md:gap-3">
          {blanks}
          {days}
        </div>
      </div>
    );
  };

  const renderDateDetailsModal = () => {
    if (!selectedDateRecord) return null;
    const { date, record, day } = selectedDateRecord;
    const dateObj = new Date(date);
    const cleanCheckOut = record ? getCleanCheckOut(record) : null;

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className="bg-bg-secondary border border-border shadow-xl rounded-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          <div className="bg-bg-primary/50 px-6 py-4 border-b border-border/50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-text-primary font-outfit">Log Details</h3>
              <p className="text-xs text-text-secondary font-medium">{dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <button onClick={() => setSelectedDateRecord(null)} className="text-text-secondary hover:text-danger hover:bg-danger/10 p-2 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <div className="p-6">
            {!record ? (
              <div className="text-center py-8">
                <FileText size={32} className="mx-auto text-text-secondary opacity-30 mb-3" />
                <p className="text-text-primary font-bold">No Records Found</p>
                <p className="text-xs text-text-secondary mt-1 mb-6">There is no attendance data for this date.</p>
                <button
                  onClick={() => setSelectedDateRecord(null)}
                  className="w-full py-2.5 px-4 bg-bg-primary hover:bg-bg-secondary text-text-secondary hover:text-text-primary rounded-xl text-xs font-semibold border border-border/60 transition-all shadow-sm active:scale-95"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-secondary">Status</span>
                  <span className={`px-3 py-1 rounded text-xs font-bold ${
                    record.status === 'Present' ? 'text-success bg-success/10' :
                    record.status === 'Absent' ? 'text-danger bg-danger/10' :
                    'text-orange-500 bg-orange-500/10'
                  }`}>
                    {record.status}
                  </span>
                </div>
                
                <div className="bg-bg-primary rounded-xl p-4 border border-border/50 flex items-center justify-between shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Check In</span>
                    <span className="font-bold text-text-primary text-base tabular-nums">
                      {record.checkIn ? formatDisplayTime(record.checkIn) : '--:--'}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-border/80"></div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">
                      Check Out {record.isAutoCheckOut ? '(Auto Shift)' : ''}
                    </span>
                    <span className="font-bold text-text-primary text-base tabular-nums">
                      {cleanCheckOut ? formatDisplayTime(cleanCheckOut) : '--:--'}
                    </span>
                  </div>
                </div>

                {record.overtimeMinutes > 0 && (
                  <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-xl p-3.5 space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-accent-blue font-bold text-xs">
                      <span className="flex items-center"><Clock size={14} className="mr-1.5" /> Overtime: {formatMinutes(record.overtimeMinutes)}</span>
                      <span className="text-[9px] uppercase tracking-wider bg-accent-blue/20 px-2 py-0.5 rounded-full font-bold">Approved</span>
                    </div>
                    {record.overtimeReason && (
                      <p className="text-xs text-text-secondary italic">"{record.overtimeReason}"</p>
                    )}
                    <p className="text-[10px] text-text-secondary">
                      Recorded by: <span className="font-semibold text-text-primary">{record.overtimeApprovedBy?.name || 'Managing Director (MD) / HR'}</span>
                    </p>
                  </div>
                )}
                
                {(record.isLate || record.isEarlyLeave) && (
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3.5 space-y-2">
                    {record.isLate && (
                      <div className="flex items-center text-xs font-semibold text-danger">
                        <Clock size={13} className="mr-1.5" /> Late by {formatMinutes(record.lateMinutes)}
                      </div>
                    )}
                    {record.isEarlyLeave && (
                      <div className="flex items-center text-xs font-semibold text-orange-600">
                        <Clock size={13} className="mr-1.5" /> Punched out early
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => setSelectedDateRecord(null)}
                    className="w-full py-2.5 px-4 bg-bg-primary hover:bg-bg-secondary text-text-secondary hover:text-text-primary rounded-xl text-xs font-semibold border border-border/60 transition-all flex items-center justify-center active:scale-95 shadow-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary h-full animate-fade-in">
      <div className="w-12 h-12 border-4 border-border border-t-accent-blue rounded-full animate-spin mb-4"></div>
      <p className="text-text-secondary font-medium">Loading workspace...</p>
    </div>
  );
  if (!workspace) return <div className="p-8 text-danger">Please create a workspace first.</div>;

  return (
    <div className="h-full flex flex-col font-sans overflow-hidden bg-bg-primary">
      <div className="px-8 py-6 shrink-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-wide font-outfit">Attendance & Leave</h1>
            <p className="text-text-secondary text-sm mt-1">Manage your attendance and leave requests.</p>
          </div>
          <div className="flex space-x-4 items-center">
            {isMDorHR && activeTab === 'attendance' && (
              <button 
                onClick={() => openOvertimeModal()} 
                className="bg-accent-blue text-white px-4 py-2.5 rounded-xl hover:opacity-90 transition-all text-sm font-semibold flex items-center shadow-md active:scale-95"
              >
                <Clock size={16} className="mr-2" />
                <span>+ Log Overtime</span>
                <span className="ml-2 text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">MD / HR</span>
              </button>
            )}
            {activeTab === 'leave' && currentUserRole !== 'super_admin' && (
              <button onClick={() => setIsLeaveModalOpen(true)} className="bg-gradient-to-r from-accent-blue to-accent-indigo text-white px-5 py-2.5 rounded-xl hover:shadow-lg transition-all text-sm font-semibold flex items-center shadow-md">
                <span>Apply Leave</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex border-b border-border/60 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`px-5 py-2.5 font-bold text-sm transition-colors border-b-2 ${activeTab === 'attendance' ? 'border-accent-blue text-accent-blue bg-accent-blue/5' : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-secondary'}`}
          >
            Attendance Log
          </button>
          <button 
            onClick={() => setActiveTab('leave')}
            className={`px-5 py-2.5 font-bold text-sm transition-colors border-b-2 ${activeTab === 'leave' ? 'border-accent-blue text-accent-blue bg-accent-blue/5' : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-secondary'}`}
          >
            Leave Requests
          </button>
          <button 
            onClick={() => setActiveTab('early-leave')}
            className={`px-5 py-2.5 font-bold text-sm transition-colors border-b-2 ${activeTab === 'early-leave' ? 'border-accent-blue text-accent-blue bg-accent-blue/5' : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-secondary'}`}
          >
            Early Leaves
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col px-8">
        {activeTab === 'attendance' ? (
          <div className="flex flex-col h-full space-y-6 overflow-y-auto custom-scrollbar pr-2">
            {/* Modern Check In / Check Out Area */}
            <div className="bg-bg-secondary rounded-3xl border border-border/50 p-6 flex flex-col md:flex-row items-center justify-between shadow-soft relative overflow-hidden glass shrink-0">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent-blue/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex items-center space-x-6 z-10">
                <DigitalClock className="w-32 h-24 shadow-md bg-bg-primary/80" />
                <div>
                  <h3 className="font-outfit text-2xl font-black text-text-primary mb-1">Timecard</h3>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <p className="text-sm font-medium text-text-secondary flex items-center">
                      <CalendarIcon size={14} className="mr-1.5" />
                      {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    <div className="flex items-center text-xs font-semibold text-accent-blue bg-accent-blue/10 px-2.5 py-0.5 rounded-full border border-accent-blue/20">
                      <Clock size={12} className="mr-1.5" />
                      Shift: {user?.shiftStartTime || '09:40'} - {user?.shiftEndTime || '18:00'}
                    </div>
                  </div>
                  <div className="mt-3">
                    {isCheckedIn ? (
                      isCheckedOut ? (
                        <div className="flex items-center space-x-2 text-sm font-bold bg-success/10 text-success px-3 py-1.5 rounded-lg w-fit border border-success/20 shadow-sm">
                          <CheckCircle size={16} className="text-success" />
                          <span>Shift Completed {todayAttendance?.overtimeMinutes > 0 ? `(+${todayAttendance.overtimeHours || +(todayAttendance.overtimeMinutes / 60).toFixed(1)}h OT)` : ''}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-sm font-bold bg-success/10 text-success px-3 py-1.5 rounded-lg w-fit border border-success/20 shadow-sm">
                          <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                          <span>Currently On the Clock</span>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center space-x-2 text-sm font-bold bg-bg-primary text-text-secondary px-3 py-1.5 rounded-lg w-fit border border-border shadow-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-text-secondary"></span>
                        <span>Currently Off the Clock</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 md:mt-0 flex flex-col items-center md:items-end space-y-3 z-10">
                {isCheckedIn ? (
                  <div className="flex flex-col items-end">
                    {!isCheckedOut ? (
                      <>
                        {todayEarlyLeaveStatus && todayEarlyLeaveStatus !== 'approved' && todayEarlyLeaveStatus !== 'rejected' ? (
                          <div className="bg-orange-500/10 border border-orange-500/20 px-6 py-2.5 rounded-xl text-orange-500 font-bold flex items-center shadow-inner text-sm mb-2">
                             Pending Early Leave Approval
                          </div>
                        ) : null}
                        <button onClick={handleCheckOut} className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-3 rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all font-bold flex items-center active:scale-95 group text-sm">
                          <LogOut size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                          Punch Out
                        </button>
                        <p className="text-[11px] text-text-secondary mt-2 font-medium">Automatic logout at shift schedule ({user?.shiftEndTime || '18:00'}).</p>
                      </>
                    ) : (
                      <div className="flex flex-col items-end">
                        <div className="bg-success/10 border border-success/20 px-6 py-3 rounded-xl text-success font-bold flex items-center shadow-inner text-sm">
                          <CheckCircle size={18} className="mr-2" />
                          {todayAttendance?.overtimeMinutes > 0 ? (
                            <span>Shift & Overtime Completed ({todayAttendance.overtimeHours || +(todayAttendance.overtimeMinutes / 60).toFixed(1)}h OT)</span>
                          ) : (
                            <span>Shift Completed (Auto Logged Out at {user?.shiftEndTime || '18:00'})</span>
                          )}
                        </div>
                        {todayAttendance?.overtimeMinutes > 0 ? (
                          <p className="text-[11px] text-amber-500 mt-2 font-semibold flex items-center">
                            <Clock size={12} className="mr-1" />
                            Overtime of {formatMinutes(todayAttendance.overtimeMinutes)} recorded by {todayAttendance.overtimeApprovedBy?.name || 'Managing Director (MD) / HR'}
                          </p>
                        ) : (
                          <p className="text-[11px] text-text-secondary mt-2 font-medium">
                            Automatically logged out at shift schedule ({user?.shiftEndTime || '18:00'}).
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-end">
                    <button onClick={handleCheckIn} className="bg-gradient-to-r from-accent-blue to-accent-indigo text-white px-8 py-3 rounded-xl hover:shadow-lg hover:shadow-accent-blue/30 transition-all font-bold flex items-center active:scale-95 group text-sm">
                      <LogIn size={18} className="mr-2 group-hover:translate-x-1 transition-transform" />
                      Punch In
                    </button>
                    <p className="text-[11px] text-text-secondary mt-2 font-medium">Ready to start your day?</p>
                  </div>
                )}
              </div>
            </div>

            {/* Toggle My Logs / Team Logs */}
            {['super_admin', 'hr', 'tl'].includes(currentUserRole) && (
              <div className="flex space-x-2 bg-bg-secondary p-1.5 rounded-xl border border-border/50 shadow-sm w-fit shrink-0">
                <button 
                  onClick={() => { setLogView('mine'); setSelectedTeamMember(null); }} 
                  className={`px-6 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${logView === 'mine' ? 'bg-accent-blue text-white shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary'}`}
                >
                  My Logs
                </button>
                <button 
                  onClick={() => setLogView('team')} 
                  className={`px-6 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${logView === 'team' ? 'bg-accent-blue text-white shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary'}`}
                >
                  Team Logs
                </button>
              </div>
            )}

            {/* Calendar Views */}
            <div className="flex-1 flex gap-6 min-h-[500px]">
              {logView === 'mine' ? (
                // Full Width Calendar for My Logs
                <div className="w-full flex">
                  {renderCalendar(user._id)}
                </div>
              ) : (
                // Split View for Team Logs
                <div className="w-full flex gap-6">
                  {/* Left Sidebar: Team Members List */}
                  <div className="w-72 shrink-0 bg-bg-secondary border border-border/60 rounded-2xl p-4 flex flex-col shadow-sm overflow-hidden">
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-4 px-2">Team Members</h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                      {teamMembers.filter(m => m.user._id !== user._id).map(member => (
                        <button
                          key={member.user._id}
                          onClick={() => setSelectedTeamMember(member.user)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${
                            selectedTeamMember?._id === member.user._id 
                            ? 'bg-accent-blue/10 border-accent-blue/30 shadow-sm' 
                            : 'bg-bg-primary border-transparent hover:border-border hover:bg-bg-secondary'
                          }`}
                        >
                          <Avatar user={member.user} size="w-10 h-10" textClass="text-xs" showStatus={false} />
                          <div className="flex flex-col text-left overflow-hidden">
                            <span className={`text-sm font-bold truncate ${selectedTeamMember?._id === member.user._id ? 'text-accent-blue' : 'text-text-primary'}`}>{member.user.name}</span>
                            <span className="text-[10px] text-text-secondary uppercase tracking-widest font-semibold mt-0.5 truncate">{member.role.replace('_', ' ')}</span>
                          </div>
                        </button>
                      ))}
                      {teamMembers.filter(m => m.user._id !== user._id).length === 0 && (
                        <div className="text-center py-8 text-text-secondary text-sm">No other team members found.</div>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Calendar for selected member */}
                  <div className="flex-1 flex">
                    {selectedTeamMember ? (
                      renderCalendar(selectedTeamMember._id)
                    ) : (
                      <div className="flex-1 bg-bg-secondary border border-border/60 rounded-2xl border-dashed flex flex-col items-center justify-center p-8 text-center shadow-sm">
                        <div className="w-20 h-20 bg-bg-primary rounded-full flex items-center justify-center mb-4 shadow-inner border border-border">
                          <User size={32} className="text-text-secondary opacity-40" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">Select a Team Member</h3>
                        <p className="text-sm text-text-secondary">Click on a member from the sidebar to view their attendance calendar.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {renderDateDetailsModal()}
          </div>
        ) : activeTab === 'leave' ? (
          /* Keep Leave Requests section unchanged structurally, but add better wrappers if needed. For now keeping it visually similar but inside the flex-1 area */
          <div className="overflow-x-auto flex-1 bg-bg-secondary border border-border rounded-2xl shadow-sm p-6 custom-scrollbar">
            <div className="space-y-8">
              {currentUserRole !== 'super_admin' && (
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-4 font-outfit">My Leaves</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="text-left w-32">TYPE</th>
                        <th className="text-left">DURATION</th>
                        <th className="text-left w-32">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRecords.filter(l => l.user?._id === user._id).map(leave => (
                        <tr key={leave._id}>
                          <td className="font-medium text-text-primary">{leave.type}</td>
                          <td className="text-text-secondary">
                            {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}
                            <br />
                            <span className="text-xs opacity-70">{leave.reason}</span>
                          </td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              leave.status === 'Approved' ? 'text-success bg-success/10' :
                              leave.status === 'Rejected' ? 'text-danger bg-danger/10' :
                              'text-orange-500 bg-orange-500/10'
                            }`}>
                              {leave.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {leaveRecords.filter(l => l.user?._id === user._id).length === 0 && (
                        <tr>
                          <td colSpan="3" className="text-center py-8 text-text-secondary">No leave requests found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {(currentUserRole === 'super_admin' || currentUserRole === 'hr') && (
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-4 font-outfit">Team Leave Requests</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="text-left w-48">EMPLOYEE</th>
                        <th className="text-left w-32">TYPE</th>
                        <th className="text-left">DURATION</th>
                        <th className="text-left w-32">STATUS</th>
                        <th className="text-right w-32">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRecords.filter(l => l.user?._id !== user._id).map(leave => (
                        <tr key={leave._id}>
                          <td className="font-medium text-text-primary">
                            <div className="flex items-center space-x-2">
                              <Avatar user={leave.user || leave.employee} size="w-6 h-6" textClass="text-[10px]" showStatus={false} />
                              <span>{(leave.user || leave.employee)?.name}</span>
                            </div>
                          </td>
                          <td className="text-text-secondary">{leave.type}</td>
                          <td className="text-text-secondary">
                            {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}
                            <br />
                            <span className="text-xs opacity-70">{leave.reason}</span>
                          </td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              leave.status === 'Approved' ? 'text-success bg-success/10' :
                              leave.status === 'Rejected' ? 'text-danger bg-danger/10' :
                              'text-orange-500 bg-orange-500/10'
                            }`}>
                              {leave.status}
                            </span>
                          </td>
                          <td className="text-right space-x-2 whitespace-nowrap">
                            {leave.status === 'Pending' ? (
                              <>
                                <button onClick={() => handleLeaveStatus(leave._id, 'Approved')} className="text-success hover:bg-success/10 p-1.5 rounded transition-colors" title="Approve"><Check size={18} /></button>
                                <button onClick={() => handleLeaveStatus(leave._id, 'Rejected')} className="text-danger hover:bg-danger/10 p-1.5 rounded transition-colors" title="Reject"><X size={18} /></button>
                              </>
                            ) : (
                              <span className="text-xs text-text-secondary">By: {leave.approvedBy?.name}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {leaveRecords.filter(l => l.user?._id !== user._id).length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center py-8 text-text-secondary">No team leave requests found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'early-leave' ? (
          <div className="overflow-x-auto flex-1 bg-bg-secondary border border-border rounded-2xl shadow-sm p-6 custom-scrollbar">
            <div className="space-y-8">
              {currentUserRole !== 'super_admin' && (
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-4 font-outfit">My Early Leaves</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="text-left w-32">DATE</th>
                        <th className="text-left w-32">TIME</th>
                        <th className="text-left">REASON</th>
                        <th className="text-left w-48">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earlyLeaves.filter(l => l.employee?._id === user._id).map(leave => (
                        <tr key={leave._id}>
                          <td className="font-medium text-text-primary">{leave.date}</td>
                          <td className="text-text-secondary">{leave.requestedLeaveTime}</td>
                          <td className="text-text-secondary">{leave.reason}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider ${
                              leave.status === 'approved' ? 'text-success bg-success/10' :
                              leave.status === 'rejected' ? 'text-danger bg-danger/10' :
                              'text-orange-500 bg-orange-500/10'
                            }`}>
                              {leave.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {earlyLeaves.filter(l => l.employee?._id === user._id).length === 0 && (
                        <tr><td colSpan="4" className="text-center py-8 text-text-secondary">No early leave requests found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {(currentUserRole === 'super_admin' || currentUserRole === 'hr') && (
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-4 font-outfit">Team Early Leave Requests</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="text-left w-48">EMPLOYEE</th>
                        <th className="text-left w-32">DATE / TIME</th>
                        <th className="text-left">REASON</th>
                        <th className="text-left w-32">STATUS</th>
                        <th className="text-right w-32">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earlyLeaves.filter(l => l.employee?._id !== user._id).map(leave => (
                        <tr key={leave._id}>
                          <td className="font-medium text-text-primary">
                            <div className="flex items-center space-x-2">
                              <Avatar user={leave.employee} size="w-6 h-6" textClass="text-[10px]" showStatus={false} />
                              <span>{leave.employee?.name}</span>
                            </div>
                          </td>
                          <td className="text-text-secondary">
                            {leave.date}<br/>{leave.requestedLeaveTime}
                          </td>
                          <td className="text-text-secondary text-sm">{leave.reason}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider ${
                              leave.status === 'approved' ? 'text-success bg-success/10' :
                              leave.status === 'rejected' ? 'text-danger bg-danger/10' :
                              'text-orange-500 bg-orange-500/10'
                            }`}>
                              {leave.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="text-right space-x-2 whitespace-nowrap">
                            {(
                              (currentUserRole === 'hr' && ['pending_tl', 'pending_hr'].includes(leave.status)) ||
                              (currentUserRole === 'super_admin' && ['pending_tl', 'pending_hr', 'pending_md'].includes(leave.status))
                            ) ? (
                              <>
                                <button onClick={() => handleEarlyLeaveApproval(leave._id, 'approve')} className="text-success hover:bg-success/10 p-1.5 rounded transition-colors" title="Approve"><Check size={18} /></button>
                                <button onClick={() => handleEarlyLeaveApproval(leave._id, 'reject')} className="text-danger hover:bg-danger/10 p-1.5 rounded transition-colors" title="Reject"><X size={18} /></button>
                              </>
                            ) : (
                              <span className="text-xs text-text-secondary opacity-50">Processed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {earlyLeaves.filter(l => l.employee?._id !== user._id).length === 0 && (
                        <tr><td colSpan="5" className="text-center py-8 text-text-secondary">No team requests found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-bg-secondary/95 backdrop-blur-xl border border-white/10 p-0 rounded-3xl w-full max-w-[420px] shadow-[0_32px_64px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-accent-blue/10 to-accent-indigo/10 px-8 py-6 border-b border-white/10 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-black text-text-primary mb-1 font-outfit">Apply for Leave</h3>
                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Request time off</p>
              </div>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors p-2.5 rounded-full border border-border/50 shadow-sm bg-bg-secondary">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar bg-bg-secondary">
            <form onSubmit={handleApplyLeave} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-widest">Leave Type</label>
                <select 
                  value={leaveData.type} onChange={e => setLeaveData({...leaveData, type: e.target.value})}
                  className="premium-input text-base font-semibold text-text-primary"
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Earned">Earned Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-widest">Start Date</label>
                  <input 
                    type="date" required 
                    value={leaveData.startDate} onChange={e => setLeaveData({...leaveData, startDate: e.target.value})}
                    className="premium-input text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-widest">End Date</label>
                  <input 
                    type="date" required 
                    value={leaveData.endDate} onChange={e => setLeaveData({...leaveData, endDate: e.target.value})}
                    className="premium-input text-sm font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-widest">Reason</label>
                <textarea 
                  required rows="3"
                  value={leaveData.reason} onChange={e => setLeaveData({...leaveData, reason: e.target.value})}
                  className="premium-input resize-none text-base"
                  placeholder="Reason for taking leave..."
                ></textarea>
              </div>
              <div className="flex justify-end space-x-4 mt-10 pt-6 border-t border-border/50">
                <button 
                  type="button" 
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-6 py-3 text-text-secondary font-bold hover:bg-bg-primary hover:text-text-primary rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-gradient-to-r from-accent-blue to-accent-indigo text-white px-8 py-3 rounded-xl hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 font-bold shadow-md shadow-accent-blue/20"
                >
                  Submit Request
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {isEarlyLeaveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-bg-secondary/95 backdrop-blur-xl border border-white/10 p-0 rounded-3xl w-full max-w-[420px] shadow-[0_32px_64px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 px-8 py-6 border-b border-white/10 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-black text-text-primary mb-1 font-outfit">Early Leave Request</h3>
                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Requires Approval</p>
              </div>
              <button onClick={() => setIsEarlyLeaveModalOpen(false)} className="text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors p-2.5 rounded-full border border-border/50 shadow-sm bg-bg-secondary">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar bg-bg-secondary">
            <form onSubmit={submitEarlyLeave} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-widest">Leave Time</label>
                <input 
                  type="time" required 
                  value={earlyLeaveData.requestedLeaveTime} onChange={e => setEarlyLeaveData({...earlyLeaveData, requestedLeaveTime: e.target.value})}
                  className="premium-input text-base font-semibold focus:border-orange-500 focus:ring-orange-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-widest">Reason for Leaving Early</label>
                <textarea 
                  required rows="3"
                  value={earlyLeaveData.reason} onChange={e => setEarlyLeaveData({...earlyLeaveData, reason: e.target.value})}
                  className="premium-input resize-none text-base focus:border-orange-500 focus:ring-orange-500/20"
                  placeholder="Explain why you need to punch out early..."
                ></textarea>
              </div>
              <div className="flex justify-end space-x-4 mt-10 pt-6 border-t border-border/50">
                <button type="button" onClick={() => setIsEarlyLeaveModalOpen(false)} className="px-6 py-3 text-text-secondary font-bold hover:bg-bg-primary hover:text-text-primary rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-3 rounded-xl hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 font-bold shadow-md shadow-orange-500/20">
                  Request Permission
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Overtime Modal (MD & HR Only) */}
      {isOvertimeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-2xl max-h-[88vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg-secondary shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue shadow-sm">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary font-outfit">Log Employee Overtime</h3>
                  <p className="text-xs text-text-secondary font-medium">Authorized for Managing Director (MD) & HR</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOvertimeModalOpen(false)} 
                className="text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors p-2 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveOvertime} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                {/* 2-Column: Team Member & Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wider">
                      Team Member
                    </label>
                    <select
                      value={overtimeData.userId}
                      onChange={(e) => setOvertimeData({ ...overtimeData, userId: e.target.value })}
                      className="w-full bg-bg-primary border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors font-medium"
                      required
                    >
                      <option value="">Select Employee...</option>
                      {teamMembers.map(m => (
                        <option key={m.user._id} value={m.user._id}>
                          {m.user.name} ({m.user.designation || m.role}) — {m.user.shiftStartTime || '09:40'} to {m.user.shiftEndTime || '18:00'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wider">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={overtimeData.date}
                      onChange={(e) => setOvertimeData({ ...overtimeData, date: e.target.value })}
                      className="w-full bg-bg-primary border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors font-medium"
                    />
                  </div>
                </div>

                {/* Shift & Live Calculation Banner */}
                {(() => {
                  const selUser = teamMembers.find(m => m.user._id === overtimeData.userId)?.user;
                  const shiftStart = selUser?.shiftStartTime || '09:40';
                  const shiftEnd = selUser?.shiftEndTime || '18:00';
                  const [endH, endM] = shiftEnd.split(':').map(Number);
                  const totalM = (parseInt(overtimeData.hours, 10) || 0) * 60 + (parseInt(overtimeData.minutes, 10) || 0);
                  const finalMinutes = (endH || 18) * 60 + (endM || 0) + totalM;
                  const finalH = Math.floor(finalMinutes / 60) % 24;
                  const finalM = finalMinutes % 60;
                  const timeFormatted = `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
                  
                  return (
                    <div className="bg-bg-primary border border-border/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="text-text-secondary font-medium">Scheduled Shift:</span>
                        <span className="font-bold text-text-primary bg-bg-secondary px-2.5 py-1 rounded-lg border border-border">
                          {shiftStart} - {shiftEnd}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-text-secondary font-medium">Final Punch-Out:</span>
                        <span className="font-bold text-accent-blue bg-accent-blue/10 px-2.5 py-1 rounded-lg border border-accent-blue/20">
                          {timeFormatted} (+{formatMinutes(totalM)})
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Overtime Duration with Presets & Inputs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                      Overtime Duration
                    </label>
                    <span className="text-xs font-semibold text-text-secondary">
                      Total Added: <strong className="text-accent-blue font-bold">{formatMinutes((parseInt(overtimeData.hours, 10) || 0) * 60 + (parseInt(overtimeData.minutes, 10) || 0))}</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      { label: '+30m', h: 0, m: 30 },
                      { label: '+1h', h: 1, m: 0 },
                      { label: '+1.5h', h: 1, m: 30 },
                      { label: '+2h', h: 2, m: 0 },
                      { label: '+2.5h', h: 2, m: 30 },
                      { label: '+3h', h: 3, m: 0 },
                      { label: '+4h', h: 4, m: 0 }
                    ].map(preset => {
                      const isSelected = Number(overtimeData.hours) === preset.h && Number(overtimeData.minutes) === preset.m;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setOvertimeData({ ...overtimeData, hours: preset.h, minutes: preset.m })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            isSelected 
                              ? 'bg-accent-blue text-white border-accent-blue shadow-sm' 
                              : 'bg-bg-primary text-text-secondary border-border hover:border-accent-blue/50 hover:text-text-primary'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-text-secondary font-medium mb-1">Hours</label>
                      <input
                        type="number"
                        min="0"
                        max="12"
                        value={overtimeData.hours}
                        onChange={(e) => setOvertimeData({ ...overtimeData, hours: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        className="w-full bg-bg-primary border border-border rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-text-secondary font-medium mb-1">Minutes</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        step="5"
                        value={overtimeData.minutes}
                        onChange={(e) => setOvertimeData({ ...overtimeData, minutes: Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)) })}
                        className="w-full bg-bg-primary border border-border rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Reason / Work Description */}
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wider">
                    Reason / Overtime Work Description
                  </label>
                  <textarea
                    rows="2"
                    required
                    value={overtimeData.reason}
                    onChange={(e) => setOvertimeData({ ...overtimeData, reason: e.target.value })}
                    placeholder="e.g., Client deliverable deployment, Critical bug triage, Production release..."
                    className="w-full bg-bg-primary border border-border rounded-xl p-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors resize-none font-medium custom-scrollbar"
                  ></textarea>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-border bg-bg-primary/50 flex justify-end space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOvertimeModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-bg-primary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overtimeSaving}
                  className="bg-accent-blue text-white px-6 py-2.5 rounded-xl hover:opacity-90 font-bold text-sm shadow-sm transition-all disabled:opacity-60 flex items-center"
                >
                  {overtimeSaving ? 'Recording...' : 'Record Overtime'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceLeave;
