import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Calendar, Clock, CheckCircle, XCircle, FileText, Check, X, LogIn, LogOut, Timer } from 'lucide-react';
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

const AttendanceLeave = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [logView, setLogView] = useState('mine');
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('employee');
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'leave'
  
  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);

  // Leave State
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveData, setLeaveData] = useState({ type: 'Sick', startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  const fetchWorkspaceData = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const currentWs = wsRes.data[0];
        setWorkspace(currentWs);
        
        // Fetch in parallel
        fetchAttendance(currentWs._id);
        fetchLeaves(currentWs._id);
        
        const detailRes = await axios.get(`/workspaces/${currentWs._id}`);
        const validMembers = (detailRes.data.members || []).filter(m => m.user);
        
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
    try {
      await axios.put(`/workspaces/${workspace._id}/attendance/checkout`);
      showToast('Checked out successfully!', 'success');
      setIsCheckedOut(true);
      fetchAttendance(workspace._id);
    } catch (error) {
      showToast(error.response?.data?.message || 'Check-out failed', 'error');
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

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary h-full animate-fade-in">
      <div className="w-12 h-12 border-4 border-border border-t-accent-blue rounded-full animate-spin mb-4"></div>
      <p className="text-text-secondary font-medium">Loading workspace...</p>
    </div>
  );
  if (!workspace) return <div className="p-8 text-danger">Please create a workspace first.</div>;

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-wide">Attendance & Leave</h1>
          <p className="text-text-secondary mt-1">Manage your attendance and leave requests.</p>
        </div>
        <div className="flex space-x-6 items-center">
          {activeTab === 'leave' && (
            <button onClick={() => setIsLeaveModalOpen(true)} className="bg-[#4285f4] text-white px-5 py-2.5 rounded-xl hover:bg-accent-indigo transition-colors text-sm font-semibold flex items-center shadow-md">
              <span>Apply Leave</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-border mb-6">
        <button 
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'attendance' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          Attendance Log
        </button>
        <button 
          onClick={() => setActiveTab('leave')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'leave' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          Leave Requests
        </button>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
        {activeTab === 'attendance' ? (
          <div className="flex flex-col h-full">
            {/* Modern Check In / Check Out Area */}
            <div className="p-3 border-b border-border shrink-0">
              <div className="bg-bg-primary rounded-2xl border border-border p-4 flex flex-col md:flex-row items-center justify-between shadow-sm relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent-blue/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex items-center space-x-5 z-10">
                  <DigitalClock />
                  <div>
                    <h3 className="font-outfit text-xl font-bold text-text-primary mb-0.5">Timecard</h3>
                    <p className="text-sm text-text-secondary flex items-center">
                      <Calendar size={14} className="mr-1.5" />
                      {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    <div className="mt-3">
                      {isCheckedIn ? (
                        <div className="flex items-center space-x-2 text-sm font-medium">
                          <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                          <span className="text-success">Currently On the Clock</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-sm font-medium">
                          <span className="w-2 h-2 rounded-full bg-text-secondary"></span>
                          <span className="text-text-secondary">Currently Off the Clock</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 md:mt-0 flex flex-col items-center md:items-end space-y-3 z-10">
                  {isCheckedIn ? (
                    <div className="flex flex-col items-end">
                      {!isCheckedOut ? (
                        <button onClick={handleCheckOut} className="bg-orange-500 text-white px-6 py-2.5 rounded-xl hover:bg-orange-600 transition-all font-semibold flex items-center shadow-md hover:shadow-orange-500/25 active:scale-95 group text-sm">
                          <LogOut size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                          Punch Out
                        </button>
                      ) : (
                        <div className="bg-success/10 border border-success/20 px-6 py-2.5 rounded-xl text-success font-bold flex items-center shadow-inner text-sm">
                          <CheckCircle size={18} className="mr-2" />
                          Shift Completed
                        </div>
                      )}
                      <p className="text-[11px] text-text-secondary mt-2 font-medium">Don't forget to punch out before leaving.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <button onClick={handleCheckIn} className="bg-accent-blue text-white dark:text-text-primary px-6 py-2.5 rounded-xl hover:bg-accent-indigo transition-all font-bold flex items-center shadow-md hover:shadow-blue-500/25 active:scale-95 group text-sm">
                        <LogIn size={18} className="mr-2 group-hover:translate-x-1 transition-transform" />
                        Punch In
                      </button>
                      <p className="text-[10px] text-text-secondary mt-1.5 font-medium">Ready to start your day?</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {['super_admin', 'hr', 'tl'].includes(currentUserRole) && (
              <div className="px-4 py-3 flex space-x-6 border-b border-border bg-bg-primary">
                <button 
                  onClick={() => setLogView('mine')} 
                  className={`text-sm font-bold pb-2 transition-colors border-b-2 ${logView === 'mine' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                >
                  My Logs
                </button>
                <button 
                  onClick={() => setLogView('team')} 
                  className={`text-sm font-bold pb-2 transition-colors border-b-2 ${logView === 'team' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                >
                  Team Logs
                </button>
              </div>
            )}

            <div className="overflow-x-auto flex-1 p-4">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="text-left w-48">DATE</th>
                    <th className="text-left">EMPLOYEE</th>
                    <th className="text-left w-32">STATUS</th>
                    <th className="text-left w-32">CHECK IN</th>
                    <th className="text-left w-32">CHECK OUT</th>
                  </tr>
                </thead>
                <tbody>
                  {(logView === 'mine' ? attendanceRecords.filter(r => r.user?._id === user._id) : attendanceRecords.filter(r => r.user?._id !== user._id)).map(record => (
                    <tr key={record._id}>
                      <td className="font-medium text-text-primary">{( record.date ? new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : "N/A" )}</td>
                      <td className="text-text-secondary">
                        <div className="flex items-center space-x-2">
                          <Avatar user={record.user} size="w-6 h-6" textClass="text-[10px]" showStatus={false} />
                          <span>{record.user?.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="px-2 py-1 rounded text-xs font-medium text-success bg-success/10">
                          {record.status}
                        </span>
                      </td>
                      <td className="text-text-secondary">{record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="text-text-secondary">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    </tr>
                  ))}
                  {(logView === 'mine' ? attendanceRecords.filter(r => r.user?._id === user._id) : attendanceRecords.filter(r => r.user?._id !== user._id)).length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-text-secondary">No attendance records found for this view.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1 p-4">
            <div className="space-y-8 p-2">
              <div>
                <h3 className="text-lg font-bold text-text-primary mb-4 px-2">My Leaves</h3>
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
                  <h3 className="text-lg font-bold text-text-primary mb-4 px-2">Team Leave Requests</h3>
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
        )}
      </div>

      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-bg-secondary/95 backdrop-blur-xl border border-white/10 p-0 rounded-2xl w-full max-w-[420px] shadow-[0_16px_40px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-accent-blue/10 to-accent-indigo/10 px-6 py-5 border-b border-white/10 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-1">Apply for Leave</h3>
                <p className="text-xs text-text-secondary">Request time off from work.</p>
              </div>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-text-secondary hover:text-danger transition-colors bg-bg-primary/50 hover:bg-bg-primary p-2 rounded-full">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
            
            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Leave Type</label>
                <select 
                  value={leaveData.type} onChange={e => setLeaveData({...leaveData, type: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Earned">Earned Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Start Date</label>
                  <input 
                    type="date" required 
                    value={leaveData.startDate} onChange={e => setLeaveData({...leaveData, startDate: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">End Date</label>
                  <input 
                    type="date" required 
                    value={leaveData.endDate} onChange={e => setLeaveData({...leaveData, endDate: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Reason</label>
                <textarea 
                  required rows="3"
                  value={leaveData.reason} onChange={e => setLeaveData({...leaveData, reason: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all resize-none placeholder-text-secondary"
                  placeholder="Reason for taking leave..."
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-border/50">
                <button 
                  type="button" 
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 text-text-secondary hover:bg-bg-primary rounded-lg transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-gradient-to-r from-accent-blue to-accent-indigo text-white px-5 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium shadow-lg shadow-accent-blue/20"
                >
                  Submit Request
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
