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
  const { user } = useContext(AuthContext);
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

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

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
      const todayRecord = res.data.find(r => r.date === todayStr && r.user?._id === user._id);
      
      if (todayRecord) {
        setIsCheckedIn(true);
        if (todayRecord.checkOut) {
          setIsCheckedOut(true);
        }
        if (todayRecord.earlyLeaveApproved) {
          setTodayEarlyLeaveStatus('approved');
        }
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
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
    const currentHour = now.getHours();
    
    if (currentHour < 18 && todayEarlyLeaveStatus !== 'approved') {
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
      await axios.post(`/workspaces/${workspace._id}/early-leaves`, earlyLeaveData);
      showToast('Early leave request submitted', 'success');
      setIsEarlyLeaveModalOpen(false);
      setTodayEarlyLeaveStatus('pending_tl');
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
          dot = <span className="w-2 h-2 rounded-full bg-success"></span>;
          if (record.isLate) dot = <span className="w-2 h-2 rounded-full bg-danger"></span>;
          if (record.isEarlyLeave) dot = <span className="w-2 h-2 rounded-full bg-orange-500"></span>;
        } else if (record.status === 'Absent') {
          dot = <span className="w-2 h-2 rounded-full bg-danger"></span>;
          bgColorClass = 'bg-danger/5';
        }
      }

      return (
        <div 
          key={dateStr} 
          onClick={() => setSelectedDateRecord({ date: dateStr, record, day })}
          className={`relative h-24 p-2 flex flex-col border ${borderClass} rounded-xl ${bgColorClass} cursor-pointer transition-all duration-200 group hover:border-accent-blue/50 hover:shadow-sm ${isToday ? 'ring-2 ring-accent-blue/50' : ''}`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-bold ${isToday ? 'text-accent-blue' : 'text-text-primary'}`}>{day}</span>
            {dot}
          </div>
          {record && (
            <div className="mt-auto space-y-1">
              <p className="text-[10px] font-medium text-text-secondary truncate bg-bg-secondary px-1.5 py-0.5 rounded shadow-sm border border-border/40">
                In: {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
              </p>
              <p className="text-[10px] font-medium text-text-secondary truncate bg-bg-secondary px-1.5 py-0.5 rounded shadow-sm border border-border/40">
                Out: {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
              </p>
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
        <div className="grid grid-cols-7 gap-3 mb-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-bold text-text-secondary uppercase tracking-widest">{d}</div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-3">
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

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className="bg-bg-secondary border border-border shadow-xl rounded-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          <div className="bg-bg-primary/50 px-6 py-4 border-b border-border/50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-text-primary">Log Details</h3>
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
                <p className="text-xs text-text-secondary mt-1">There is no attendance data for this date.</p>
              </div>
            ) : (
              <div className="space-y-5">
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
                    <span className="font-bold text-text-primary">{record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                  </div>
                  <div className="w-px h-8 bg-border/80"></div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Check Out</span>
                    <span className="font-bold text-text-primary">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                  </div>
                </div>
                
                {(record.isLate || record.isEarlyLeave) && (
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 space-y-2">
                    {record.isLate && (
                      <div className="flex items-center text-sm font-semibold text-danger">
                        <Clock size={14} className="mr-2" /> Late by {formatMinutes(record.lateMinutes)}
                      </div>
                    )}
                    {record.isEarlyLeave && (
                      <div className="flex items-center text-sm font-semibold text-orange-600">
                        <Clock size={14} className="mr-2" /> Punched out early
                      </div>
                    )}
                  </div>
                )}
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
            {activeTab === 'leave' && (
              <button onClick={() => setIsLeaveModalOpen(true)} className="bg-gradient-to-r from-accent-blue to-accent-indigo text-white px-5 py-2.5 rounded-xl hover:shadow-lg transition-all text-sm font-semibold flex items-center shadow-md">
                <span>Apply Leave</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex border-b border-border/60">
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
                  <p className="text-sm font-medium text-text-secondary flex items-center">
                    <CalendarIcon size={14} className="mr-1.5" />
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <div className="mt-4">
                    {isCheckedIn ? (
                      <div className="flex items-center space-x-2 text-sm font-bold bg-success/10 text-success px-3 py-1.5 rounded-lg w-fit border border-success/20 shadow-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                        <span>Currently On the Clock</span>
                      </div>
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
                      </>
                    ) : (
                      <div className="bg-success/10 border border-success/20 px-6 py-3 rounded-xl text-success font-bold flex items-center shadow-inner text-sm">
                        <CheckCircle size={18} className="mr-2" />
                        Shift Completed
                      </div>
                    )}
                    <p className="text-[11px] text-text-secondary mt-2 font-medium">Don't forget to punch out before leaving.</p>
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

              {(currentUserRole === 'super_admin' || currentUserRole === 'hr' || currentUserRole === 'team_leader') && (
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
                              <Avatar user={leave.user} size="w-6 h-6" textClass="text-[10px]" showStatus={false} />
                              <span>{leave.user?.name}</span>
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

              {(currentUserRole === 'super_admin' || currentUserRole === 'hr' || currentUserRole === 'team_leader') && (
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
                              (currentUserRole === 'team_leader' && leave.status === 'pending_tl') ||
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
    </div>
  );
};

export default AttendanceLeave;
